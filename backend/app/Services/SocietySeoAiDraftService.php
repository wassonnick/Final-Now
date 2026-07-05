<?php

namespace App\Services;

use App\Models\Society;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class SocietySeoAiDraftService
{
    public const OUTPUT_KEYS = [
        'seo_title', 'seo_description', 'seo_h1', 'intro_summary', 'about_content',
        'location_content', 'rent_content', 'sale_content', 'amenities_content',
        'investment_content', 'pros_json', 'cons_json', 'best_for_json',
        'nearby_highlights_json', 'faq_json', 'internal_link_suggestions_json', 'schema_json',
    ];

    public function isAvailable(): bool
    {
        return $this->provider() === 'claude'
            ? trim((string) config('services.claude.api_key', '')) !== ''
            : trim((string) config('services.gemini.api_key', '')) !== '';
    }

    public function generate(Society $society, string $mode = 'generate', array $existing = []): array
    {
        if (! $this->isAvailable()) {
            throw new RuntimeException('Society SEO AI is not configured. Add the existing Gemini or Claude API key on the backend.');
        }

        $facts = $this->facts($society);
        $warnings = $this->missingFacts($society);
        $prompt = $this->prompt($facts, $mode, $existing, $warnings);
        $raw = $this->provider() === 'claude' ? $this->claude($prompt) : $this->gemini($prompt);
        $draft = $this->normalize($raw);

        if (! array_filter($draft, fn ($value) => $value !== null && $value !== '' && $value !== [])) {
            throw new RuntimeException('The AI provider returned no usable SEO draft fields.');
        }

        return ['content' => $draft, 'warnings' => $warnings, 'provider' => $this->provider()];
    }

    public function missingFacts(Society $society): array
    {
        return array_values(array_filter([
            empty($society->builder) ? 'Missing builder' : null,
            empty($society->rera_number) ? 'Missing RERA' : null,
            empty($society->rent_range) ? 'Missing rent range' : null,
            empty($society->buy_range) ? 'Missing resale range' : null,
            empty($society->amenities) ? 'Missing amenities' : null,
            empty($society->nearby_schools) && empty($society->nearby_metro) && empty($society->nearby_hospitals) && empty($society->nearby_office_hubs) ? 'Missing nearby places' : null,
            empty($society->cover_image) && empty($society->image_photo_reference) && empty($society->image_candidates) ? 'Missing images' : null,
            empty($society->project_status) && empty($society->possession_date) ? 'Missing possession/status' : null,
        ]));
    }

    private function provider(): string
    {
        $configured = strtolower((string) config('services.ai_import_provider', 'gemini'));
        return $configured === 'claude' ? 'claude' : 'gemini';
    }

    private function facts(Society $society): array
    {
        // Properties use the publication audit timestamps and verified flag; there is no
        // properties.is_published column. Reuse the canonical public-inventory scope so this
        // remains aligned with PropertyController and the live PostgreSQL schema.
        $publishedInventoryCount = $society->properties()->publiclyAvailable()->count();

        return [
            'name' => $society->name,
            'builder' => $society->builder,
            'sector' => $society->sector,
            'locality' => $society->locality,
            'city' => $society->city,
            'state' => $society->state,
            'address' => $society->address,
            'project_status' => $society->project_status,
            'possession_date' => $society->possession_date,
            'rera_number' => $society->rera_number,
            'amenities' => $society->amenities ?: [],
            'nearby_schools' => $society->nearby_schools ?: [],
            'nearby_metro' => $society->nearby_metro ?: [],
            'nearby_hospitals' => $society->nearby_hospitals ?: [],
            'nearby_office_hubs' => $society->nearby_office_hubs ?: [],
            'rent_range' => $society->rent_range,
            'buy_range' => $society->buy_range,
            'average_rent' => $society->average_rent,
            'average_sale_price' => $society->average_sale_price,
            'price_per_sqft' => $society->price_per_sqft,
            'existing_description' => $society->description,
            'official_project_url' => $society->official_project_url,
            'official_rera_source_url' => $society->official_rera_source_url,
            'published_inventory_count' => $publishedInventoryCount,
        ];
    }

    private function prompt(array $facts, string $mode, array $existing, array $warnings): string
    {
        $shape = array_fill_keys(self::OUTPUT_KEYS, '');
        foreach (['pros_json', 'cons_json', 'best_for_json', 'nearby_highlights_json', 'faq_json', 'internal_link_suggestions_json'] as $key) $shape[$key] = [];
        $shape['schema_json'] = new \stdClass();

        return "Create a {$mode} SocietyFlats SEO draft for an Indian real-estate user considering rent, resale, shortlisting or verified availability in Gurgaon.\n\n"
            ."VOICE & TONE (SocietyFlats brand — match it exactly):\n- Warm, human and reassuring, like a knowledgeable local friend — never corporate, robotic or salesy.\n- Premium and confident but calm: short, clear sentences and strong verbs; no hype, no exclamation marks, no clichés ('nestled', 'dream home', 'prime location', 'stone's throw', 'luxury living at its finest').\n- Lead with how the place actually lives — how safe it feels, how it commutes, everyday life — supported by the scores and checked data. Intelligence delivered warmly, not as a spec sheet.\n- Address the reader as 'you'. Be honest about what is verified versus still to confirm; confidence should come from evidence, not adjectives.\n- No inflated claims, no fake scale, no '#1 / best-in-India' language, no guaranteed outcomes.\n\n"
            ."STRICT SAFETY RULES (override tone if they ever conflict):\n- Use only the supplied facts JSON.\n- Never invent towers, units, acres, prices, amenities, RERA, possession, distances, schools, hospitals, ratings, reviews or availability.\n- If a fact is missing, skip the claim or state that it needs verification without filler.\n- Do not promise appreciation, yield, inventory or returns.\n- Use natural helpful language without keyword stuffing.\n- Internal links must be safe relative SocietyFlats paths only; use an empty array if uncertain.\n- FAQ answers must match the visible draft content.\n- Output valid JSON only with exactly the requested keys.\n\n"
            .'SUPPLIED FACTS JSON: '.json_encode($facts, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n"
            .'MISSING FACT WARNINGS: '.json_encode($warnings)."\n"
            .($existing ? 'EXISTING DRAFT TO IMPROVE: '.json_encode($existing, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n" : '')
            .'OUTPUT SHAPE: '.json_encode($shape, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    private function gemini(string $prompt): array
    {
        $apiKey = trim((string) config('services.gemini.api_key', ''));
        $model = trim((string) config('services.gemini.model', 'gemini-2.0-flash')) ?: 'gemini-2.0-flash';
        $response = Http::timeout(45)->withHeaders(['x-goog-api-key' => $apiKey, 'Content-Type' => 'application/json'])
            ->post("https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent", [
                'systemInstruction' => ['parts' => [['text' => 'You write SocietyFlats SEO drafts in a warm, human, premium-but-honest voice — like a knowledgeable local friend, never corporate or salesy. Stay strictly factual to the supplied data, add no facts of your own, avoid hype and clichés, and return JSON only.']]],
                'contents' => [['role' => 'user', 'parts' => [['text' => $prompt]]]],
                'generationConfig' => ['temperature' => 0.2, 'responseMimeType' => 'application/json'],
            ]);
        if (! $response->successful()) throw new RuntimeException('Gemini SEO draft request failed with HTTP '.$response->status().'.');
        $text = collect(data_get($response->json(), 'candidates.0.content.parts', []))->pluck('text')->filter()->join("\n");
        return $this->decode($text);
    }

    private function claude(string $prompt): array
    {
        $client = new \Anthropic\Client(apiKey: trim((string) config('services.claude.api_key', '')));
        $message = $client->messages->create(
            maxTokens: 5000,
            messages: [['role' => 'user', 'content' => $prompt]],
            model: trim((string) config('services.claude.model', 'claude-haiku-4-5')) ?: 'claude-haiku-4-5',
            system: 'Write SocietyFlats SEO drafts in a warm, human, premium-but-honest voice — like a knowledgeable local friend, never corporate or salesy, no hype or clichés. Use only the supplied data, add no facts of your own, and return valid JSON only.',
        );
        $text = collect($message->content)->filter(fn ($block) => $block->type === 'text')->map(fn ($block) => $block->text)->join("\n");
        return $this->decode($text);
    }

    private function decode(string $text): array
    {
        $clean = trim(Str::of($text)->replaceMatches('/^```(?:json)?\s*|\s*```$/i', '')->toString());
        $decoded = json_decode($clean, true);
        if (! is_array($decoded)) throw new RuntimeException('AI returned invalid SEO JSON.');
        return $decoded;
    }

    private function normalize(array $raw): array
    {
        $draft = [];
        foreach (self::OUTPUT_KEYS as $key) $draft[$key] = $raw[$key] ?? (str_ends_with($key, '_json') ? [] : null);
        foreach (['pros_json', 'cons_json', 'best_for_json', 'nearby_highlights_json'] as $key) {
            $draft[$key] = collect(is_array($draft[$key]) ? $draft[$key] : [])
                ->map(fn ($item) => $this->listItemText($item))
                ->filter()
                ->values()
                ->all();
        }
        $draft['faq_json'] = collect(is_array($draft['faq_json']) ? $draft['faq_json'] : [])
            ->filter(fn ($item) => is_array($item) && filled($item['question'] ?? null) && filled($item['answer'] ?? null))
            ->map(fn ($item) => ['question' => trim((string) $item['question']), 'answer' => trim((string) $item['answer'])])
            ->values()->all();
        $draft['internal_link_suggestions_json'] = collect(is_array($draft['internal_link_suggestions_json']) ? $draft['internal_link_suggestions_json'] : [])
            ->map(function ($item) {
                if (is_string($item)) return str_starts_with($item, '/') ? ['label' => $item, 'url' => $item] : null;
                if (! is_array($item)) return null;
                $label = trim((string) ($item['label'] ?? $item['title'] ?? $item['anchor'] ?? ''));
                $url = trim((string) ($item['url'] ?? $item['path'] ?? ''));
                return $label !== '' && str_starts_with($url, '/') ? ['label' => $label, 'url' => $url] : null;
            })->filter()->values()->all();
        if (! is_array($draft['schema_json'])) $draft['schema_json'] = [];
        return $draft;
    }

    private function listItemText(mixed $item): string
    {
        if (is_string($item) || is_numeric($item)) return trim((string) $item);
        if (! is_array($item)) return '';

        $label = trim((string) ($item['category'] ?? $item['label'] ?? $item['title'] ?? $item['name'] ?? ''));
        $details = $item['highlights'] ?? $item['items'] ?? $item['description'] ?? $item['notes'] ?? [];
        if (is_array($details)) {
            $details = collect($details)->map(fn ($detail) => $this->listItemText($detail))->filter()->implode('; ');
        }
        $details = trim((string) $details);

        return trim($label.($label !== '' && $details !== '' ? ': ' : '').$details);
    }
}
