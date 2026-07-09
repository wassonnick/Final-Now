<?php

namespace App\Services\Social;

use App\Models\SocialPost;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class SocialDraftGeneratorService
{
    public const PROMPT_VERSION = 'sm1a-v2';

    private const HIGH_RISK_TERMS = [
        'price', 'rent', 'sale', 'available', 'availability', 'builder', 'rera', 'possession',
        'investment', 'return', 'guaranteed', 'best', 'number one', 'top', 'appreciation',
        'lowest', 'cheapest', 'luxury', 'premium', 'exclusive', 'limited', 'sold out',
    ];

    /** Which provider/model actually produced the current batch (for honest attribution). */
    private ?string $usedModel = null;

    public function __construct(
        private SocialContextService $contextService,
        private SocialImageAssetService $imageAssets,
        private \App\Services\Ops\AiBudgetGuard $budget,
    ) {}

    public function generate(array $input): array
    {
        $society = ! empty($input['society_id']) ? $this->contextService->publishedSociety((int) $input['society_id']) : null;
        $property = ! empty($input['property_id']) ? $this->contextService->publishedProperty((int) $input['property_id']) : null;

        if (! empty($input['society_id']) && ! $society) {
            throw new \InvalidArgumentException('Selected society is not published.');
        }
        if (! empty($input['property_id']) && ! $property) {
            throw new \InvalidArgumentException('Selected property is not published and approved.');
        }

        $context = $this->contextService->build($society?->id, $property?->id, $input['sector'] ?? null);
        $posts = $this->draftsFromAi($input, $context);
        $saved = [];

        foreach ($posts as $postData) {
            $normalized = $this->normalizePost($postData, $input, $society?->id, $property?->id);
            $post = SocialPost::create($normalized);

            if (! empty($input['generate_images'])) {
                $this->imageAssets->createForPost($post);
            } elseif (! empty($post->image_prompt) || ! empty($post->creative_prompt)) {
                $post->assets()->create([
                    'asset_type' => 'creative_brief',
                    'platform' => $post->platform,
                    'image_prompt' => $post->image_prompt ?: $post->creative_prompt,
                    'status' => 'needs_approval',
                    'risk_level' => $post->risk_level,
                    'metadata' => [
                        'ai_generated' => false,
                        'disclaimer' => 'Creative prompt only. SM1A does not auto-publish assets.',
                    ],
                ]);
            }

            $saved[] = $post->load('assets');
        }

        return ['context' => $context, 'posts' => $saved];
    }

    /**
     * Claude first (consistent with the rest of the stack, budget-guarded), OpenAI second,
     * deterministic branded fallback last — so drafts are always produced, and the model that
     * actually wrote them is recorded honestly.
     */
    private function draftsFromAi(array $input, array $context): array
    {
        $this->usedModel = null;
        $prompt = $this->prompt($input, $context);

        $claudeKey = trim((string) config('services.claude.api_key', ''));
        if ($claudeKey !== '' && $this->budget->allow() && ! $this->budget->providerLimited()) {
            try {
                $this->budget->record();
                $posts = $this->claudeDrafts($claudeKey, $prompt);
                if ($posts !== []) {
                    return $posts;
                }
            } catch (\Anthropic\Core\Exceptions\APIStatusException $e) {
                if (in_array((int) ($e->status ?? 0), [402, 429], true)) {
                    $this->budget->tripProviderLimit();
                }
                report($e);
            } catch (\Throwable $e) {
                report($e);
            }
        }

        $openAiKey = (string) config('services.openai.api_key', '');
        if ($openAiKey !== '') {
            try {
                $posts = $this->openAiDrafts($openAiKey, $prompt);
                if ($posts !== []) {
                    return $posts;
                }
            } catch (\Throwable $e) {
                report($e);
            }
        }

        return $this->fallbackDrafts($input, $context);
    }

    private function claudeDrafts(string $apiKey, string $prompt): array
    {
        $model = trim((string) config('services.claude.social_model'))
            ?: (trim((string) config('services.claude.model', 'claude-haiku-4-5')) ?: 'claude-haiku-4-5');

        $client = new \Anthropic\Client(apiKey: $apiKey);
        $message = $client->messages->create(
            maxTokens: 4000,
            messages: [['role' => 'user', 'content' => $prompt]],
            model: $model,
            system: $this->systemPrompt(),
        );

        $text = collect($message->content)->filter(fn ($block) => $block->type === 'text')->map(fn ($block) => $block->text)->join("\n");
        $clean = trim((string) preg_replace('/^```(?:json)?\s*|\s*```$/i', '', trim($text)));
        $decoded = json_decode($clean, true);
        $posts = is_array($decoded['posts'] ?? null) ? $decoded['posts'] : [];

        if ($posts !== []) {
            $this->usedModel = 'claude:'.$model;
        }

        return $posts;
    }

    private function openAiDrafts(string $apiKey, string $prompt): array
    {
        $model = (string) config('services.openai.model', 'gpt-4.1-mini');

        $response = Http::timeout(70)->withToken($apiKey)->post('https://api.openai.com/v1/chat/completions', [
            'model' => $model,
            'temperature' => 0.35,
            'response_format' => ['type' => 'json_object'],
            'messages' => [
                ['role' => 'system', 'content' => $this->systemPrompt()],
                ['role' => 'user', 'content' => $prompt],
            ],
        ]);

        if (! $response->successful()) {
            throw new \RuntimeException('OpenAI request failed with HTTP '.$response->status().'.');
        }

        $content = (string) data_get($response->json(), 'choices.0.message.content', '');
        $decoded = json_decode($content, true);
        $posts = is_array($decoded['posts'] ?? null) ? $decoded['posts'] : [];

        if ($posts !== []) {
            $this->usedModel = 'openai:'.$model;
        }

        return $posts;
    }

    private function normalizePost(array $post, array $input, ?int $societyId, ?int $propertyId): array
    {
        $platform = $this->allowed($post['platform'] ?? null, $input['platforms'], $input['platforms'][0]);
        $sourceType = $post['source_type'] ?? ($propertyId ? 'property' : ($societyId ? 'society' : (! empty($input['sector']) ? 'sector' : 'brand')));
        $sourceId = $propertyId ?: $societyId ?: (is_numeric($post['source_id'] ?? null) ? (int) $post['source_id'] : null);

        $risk = in_array(($post['risk_level'] ?? 'medium'), ['low', 'medium', 'high'], true) ? $post['risk_level'] : 'medium';
        $textForRisk = implode(' ', [
            $post['title'] ?? '',
            $post['hook'] ?? '',
            $post['caption'] ?? '',
            $post['creative_prompt'] ?? '',
            $post['image_prompt'] ?? '',
        ]);
        if ($this->containsHighRiskTerms($textForRisk)) {
            $risk = 'high';
        }

        return [
            'platform' => $platform,
            'post_type' => $this->postType($platform, $post['post_type'] ?? null),
            'title' => Str::limit((string) ($post['title'] ?? 'SocietyFlats social draft'), 250, ''),
            'hook' => $post['hook'] ?? null,
            'caption' => trim((string) ($post['caption'] ?? 'Choose the society before choosing the home with SocietyFlats.com.')),
            'cta' => $post['cta'] ?? 'Request a callback on SocietyFlats.com',
            'hashtags' => array_values(array_filter((array) ($post['hashtags'] ?? ['#SocietyFlats', '#GurgaonHomes']))),
            'creative_prompt' => $post['creative_prompt'] ?? null,
            'image_prompt' => $post['image_prompt'] ?? null,
            'image_style' => $this->imageStyle($post['image_style'] ?? ($input['image_style'] ?? null)),
            'carousel_slides' => is_array($post['carousel_slides'] ?? null) ? $post['carousel_slides'] : null,
            'reel_script' => $post['reel_script'] ?? null,
            'source_type' => in_array($sourceType, ['society', 'property', 'sector', 'brand', 'education'], true) ? $sourceType : null,
            'source_id' => $sourceId,
            'risk_level' => $risk,
            'status' => 'needs_approval',
            'ai_model' => $this->usedModel ?: 'system_fallback',
            'ai_image_model' => config('services.openai.image_model'),
            'ai_prompt_version' => self::PROMPT_VERSION,
        ];
    }

    private function fallbackDrafts(array $input, array $context): array
    {
        // Only pin a single society when the admin explicitly chose one; otherwise rotate.
        $society = ! empty($input['society_id']) ? ($context['published_societies_summary'][0] ?? null) : null;
        $sector = $input['sector'] ?? null;
        $count = max(1, min(10, (int) ($input['number_of_variations'] ?? 1)));
        $posts = [];

        $platforms = array_values($input['platforms']);

        // Every field set below deliberately avoids the high-risk trigger words so a keyless
        // install still yields publishable low-risk brand posts — and each variation rotates
        // subject + angle so three drafts are never the same post three times.
        $summaries = array_values((array) ($context['published_societies_summary'] ?? []));
        $angles = [
            ['hook' => 'Before shortlisting a flat, shortlist the society.', 'caption' => 'SocietyFlats helps Gurgaon families get to know a society before choosing the home inside it. Compare verified society context and location signals — no fake inventory, ever.'],
            ['hook' => 'Choosing where to live is bigger than choosing a floor plan.', 'caption' => 'The society decides your daily life: the commute, the community, the calm. SocietyFlats puts verified society context first so Gurgaon families can decide with clear eyes.'],
            ['hook' => 'How do you compare two societies you have never lived in?', 'caption' => 'Start with verified context, not hearsay. SocietyFlats reviews every society profile before it goes live, so what you compare is checked by real people.'],
            ['hook' => 'A calmer way to search for a Gurgaon home.', 'caption' => 'Skip the noise and the fake claims. SocietyFlats keeps society information review-led and honest, so your shortlist starts from solid ground.'],
        ];

        for ($index = 0; $index < $count; $index++) {
            $platform = $platforms[$index % count($platforms)];
            $rotating = $society ?: ($summaries[$index % max(1, count($summaries))] ?? null);
            $subject = $rotating['name'] ?? ($sector ?: 'Gurgaon');
            $angle = $angles[$index % count($angles)];
            $posts[] = [
                'platform' => $platform,
                'post_type' => $platform === 'linkedin' ? 'linkedin_post' : ($platform === 'google_business' ? 'google_business_post' : 'single_post'),
                'title' => 'Society-first home search in '.$subject,
                'hook' => $angle['hook'],
                'caption' => $angle['caption'],
                'cta' => 'Explore SocietyFlats.com or request a callback',
                'hashtags' => ['#SocietyFlats', '#GurgaonHomes', '#SocietyFirstSearch'],
                // Prompt copy must avoid the high-risk trigger words (e.g. "premium") or the
                // classifier will force these fallback drafts to high risk.
                'creative_prompt' => 'Create a clean branded SocietyFlats graphic showing society-first search, Gurgaon map cues and review-ready content blocks.',
                'image_prompt' => 'Warm, minimal real-estate illustration for SocietyFlats: Gurgaon skyline abstraction, society cards, map pins, soft neutral background. No fake building photos, no people faces.',
                'image_style' => $input['image_style'] ?? 'premium_real_estate',
                'carousel_slides' => [
                    ['slide' => 1, 'heading' => 'Choose the society first', 'body' => 'Compare location, amenities and public profile signals before the home.', 'image_prompt' => 'Society-first search card layout'],
                    ['slide' => 2, 'heading' => 'Avoid fake listings', 'body' => 'SocietyFlats keeps drafts and inventory review-led.', 'image_prompt' => 'Trust and review workflow graphic'],
                ],
                'reel_script' => null,
                'source_type' => $rotating ? 'society' : 'education',
                'source_id' => $rotating['id'] ?? null,
                'risk_level' => $index === 0 ? 'low' : 'medium',
                'risk_reason' => 'Fallback draft uses generic approved brand positioning only.',
            ];
        }

        return $posts;
    }

    private function systemPrompt(): string
    {
        return <<<'PROMPT'
You are generating social media draft content for SocietyFlats.com.

You may only use the provided SocietyFlats context.
You must not invent: prices, availability, builder claims, possession dates, RERA details, testimonials, rankings, market appreciation, investment returns, guarantees, exact distances, legal claims.
If data is missing, write generally and safely.
Any content mentioning price, availability, builder, possession, RERA, investment, returns, market trends, ranking, or “best/top/luxury/premium” claims must be marked high risk.
Generic educational posts can be low risk.
All outputs are drafts for admin review.
Do not include phone numbers.
Do not include private owner/lead data.
Do not mention unpublished inventory.
Return only valid JSON in the requested shape.
PROMPT;
    }

    private function prompt(array $input, array $context): string
    {
        $count = (int) $input['number_of_variations'];
        $angles = collect([
            'a practical checklist or how-to (concrete steps the reader can act on)',
            'a question or myth-buster hook that challenges a common home-search assumption',
            'a local Gurgaon insight angle grounded in the supplied society/sector context',
            'a short relatable scenario (a family or renter making a society decision)',
            'a brand-trust angle: how SocietyFlats verifies societies and avoids fake inventory',
            'a comparison mindset angle: what to weigh when choosing between societies',
        ])->take(max(2, $count))->values()->map(fn ($angle, $i) => 'Draft '.($i + 1).': '.$angle)->implode(' | ');

        return 'Generate '.$count.' CLEARLY DIFFERENT SocietyFlats social drafts for platforms '.implode(', ', $input['platforms']).'. '
            .($count > 1 ? 'Each draft must take a distinct angle — do NOT rephrase the same post. Assigned angles: '.$angles.'. Vary the hook style, caption structure, CTA wording, hashtags and image prompt between drafts, and anchor different drafts on different societies/sectors from the context where sensible. ' : '')
            .'Content pillar: '.$input['content_pillar'].'. Objective: '.$input['objective'].'. Target audience: '.$input['target_audience'].'. '
            .'Image style: '.($input['image_style'] ?? 'premium_real_estate').'. '
            ."Required JSON shape: {\"posts\":[{\"platform\":\"instagram\",\"post_type\":\"single_post | carousel | reel | story | whatsapp_status | google_business_post | linkedin_post\",\"title\":\"string\",\"hook\":\"string\",\"caption\":\"string\",\"cta\":\"string\",\"hashtags\":[\"string\"],\"creative_prompt\":\"string\",\"image_prompt\":\"string\",\"image_style\":\"premium_real_estate | clean_corporate | instagram_carousel | whatsapp_status | google_business | minimal_vector | local_area_guide\",\"carousel_slides\":[{\"slide\":1,\"heading\":\"string\",\"body\":\"string\",\"image_prompt\":\"string\"}],\"reel_script\":\"string or null\",\"source_type\":\"society | property | sector | brand | education | null\",\"source_id\":123,\"risk_level\":\"low | medium | high\",\"risk_reason\":\"string\"}]}.\n\n"
            .'Safe SocietyFlats context JSON: '.json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    private function containsHighRiskTerms(string $text): bool
    {
        $text = mb_strtolower($text);

        foreach (self::HIGH_RISK_TERMS as $term) {
            if (str_contains($text, $term)) {
                return true;
            }
        }

        return false;
    }

    private function allowed(?string $value, array $allowed, string $fallback): string
    {
        return in_array($value, $allowed, true) ? $value : $fallback;
    }

    private function postType(string $platform, ?string $value): string
    {
        $allowed = ['single_post', 'carousel', 'reel', 'story', 'whatsapp_status', 'google_business_post', 'linkedin_post'];
        if (in_array($value, $allowed, true)) {
            return $value;
        }

        return match ($platform) {
            'whatsapp' => 'whatsapp_status',
            'google_business' => 'google_business_post',
            'linkedin' => 'linkedin_post',
            default => 'single_post',
        };
    }

    private function imageStyle(?string $style): ?string
    {
        $allowed = ['premium_real_estate', 'clean_corporate', 'instagram_carousel', 'whatsapp_status', 'google_business', 'minimal_vector', 'local_area_guide'];

        return in_array($style, $allowed, true) ? $style : 'premium_real_estate';
    }
}
