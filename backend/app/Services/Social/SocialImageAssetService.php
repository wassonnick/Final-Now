<?php

namespace App\Services\Social;

use App\Models\SocialPost;
use App\Models\SocialPostAsset;
use App\Services\Ops\AiSpendTracker;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SocialImageAssetService
{
    public function __construct(private readonly AiSpendTracker $spendTracker)
    {
    }

    public function createForPost(SocialPost $post, ?string $prompt = null, string $assetType = 'creative_brief'): SocialPostAsset
    {
        $imagePrompt = trim((string) ($prompt ?: $post->image_prompt ?: $post->creative_prompt ?: $post->caption));
        $imageModel = (string) config('services.openai.image_model', '');
        $metadata = [
            'ai_generated' => false,
            'disclaimer' => 'Creative draft only. Not an actual society or property photograph.',
            'requested_dimensions' => $this->dimensionsFor($post->platform, $post->post_type),
            'safety_rules' => [
                'No fake photos of real societies.',
                'No faces.',
                'No builder logos unless approved.',
                'No fake RERA/government seals.',
                'No guaranteed return graphics.',
            ],
        ];

        if (! $imageModel) {
            return $post->assets()->create([
                'asset_type' => 'creative_brief',
                'platform' => $post->platform,
                'image_prompt' => $imagePrompt,
                'status' => 'needs_approval',
                'risk_level' => $post->risk_level,
                'metadata' => $metadata + ['reason' => 'OPENAI_IMAGE_MODEL is not configured; saved prompt as a creative brief.'],
            ]);
        }

        $apiKey = (string) config('services.openai.api_key', '');
        if (! $apiKey) {
            return $post->assets()->create([
                'asset_type' => 'creative_brief',
                'platform' => $post->platform,
                'image_prompt' => $imagePrompt,
                'status' => 'needs_approval',
                'risk_level' => $post->risk_level,
                'ai_model' => $imageModel,
                'metadata' => $metadata + ['reason' => 'OPENAI_API_KEY is not configured; saved prompt as a creative brief.'],
            ]);
        }

        try {
            // gpt-image-1 always returns b64_json and REJECTS the response_format parameter
            // (it is a dall-e-only option), so only send it to dall-e models.
            $isDalle = str_starts_with($imageModel, 'dall-e');
            $size = $this->openAiImageSize($post->platform, (string) $post->post_type, $isDalle);
            $payload = [
                'model' => $imageModel,
                'prompt' => $this->safeImagePrompt($imagePrompt),
                'size' => $size,
                'n' => 1,
            ];
            if ($isDalle) {
                $payload['response_format'] = 'b64_json';
            } else {
                // gpt-image-1 quality tier — premium by default for brand-worthy visuals.
                $payload['quality'] = (string) config('services.openai.image_quality', 'high');
            }
            [$sizeW, $sizeH] = array_map('intval', explode('x', $size));

            $response = Http::timeout(120)->withToken($apiKey)->post('https://api.openai.com/v1/images/generations', $payload);

            if (! $response->successful()) {
                throw new \RuntimeException('OpenAI image request failed with HTTP '.$response->status().': '.mb_substr((string) data_get($response->json(), 'error.message', $response->body()), 0, 300));
            }
            $quality = (string) ($payload['quality'] ?? 'standard');
            $this->spendTracker->recordOpenAiImage('social_image_assets', 'generate_image', $imageModel, $quality, $size, 1, [
                'subject_type' => 'social_post',
                'subject_id' => $post->id,
                'metadata' => ['platform' => $post->platform, 'post_type' => $post->post_type],
            ]);

            $b64 = data_get($response->json(), 'data.0.b64_json');
            if (! $b64) {
                throw new \RuntimeException('OpenAI image response did not include image data.');
            }

            $binary = base64_decode($b64, true);
            if (! $binary) {
                throw new \RuntimeException('OpenAI image data could not be decoded.');
            }

            $disk = config('filesystems.uploads_disk', 'public');
            $path = 'social/drafts/'.now()->format('Y/m').'/'.Str::uuid().'.png';
            Storage::disk($disk)->put($path, $binary, ['visibility' => 'public']);

            return $post->assets()->create([
                'asset_type' => $assetType === 'creative_brief' ? 'image' : $assetType,
                'platform' => $post->platform,
                'image_prompt' => $imagePrompt,
                'revised_prompt' => data_get($response->json(), 'data.0.revised_prompt'),
                'storage_disk' => $disk,
                'file_path' => $path,
                'public_url' => Storage::disk($disk)->url($path),
                'mime_type' => 'image/png',
                'width' => $sizeW,
                'height' => $sizeH,
                'status' => 'needs_approval',
                'risk_level' => $post->risk_level,
                'ai_model' => $imageModel,
                'metadata' => $metadata + ['ai_generated' => true],
            ]);
        } catch (\Throwable $e) {
            $this->spendTracker->recordFailure('openai', 'social_image_assets', 'generate_image', $imageModel, $e, [
                'subject_type' => 'social_post',
                'subject_id' => $post->id,
                'metadata' => ['platform' => $post->platform, 'post_type' => $post->post_type],
            ]);
            report($e);

            return $post->assets()->create([
                'asset_type' => 'creative_brief',
                'platform' => $post->platform,
                'image_prompt' => $imagePrompt,
                'status' => 'needs_approval',
                'risk_level' => $post->risk_level,
                'ai_model' => $imageModel,
                'metadata' => $metadata + ['reason' => 'Image generation failed; preserved safe creative brief for review.', 'error' => mb_substr($e->getMessage(), 0, 300)],
            ]);
        }
    }

    private function safeImagePrompt(string $prompt): string
    {
        return trim($prompt)."\n\nART DIRECTION — create a premium, scroll-stopping social-media visual for SocietyFlats.com, a trustworthy modern real-estate brand for Gurgaon home seekers. Make it warm, vibrant and aspirational: natural daylight, inviting lifestyle mood, and rich colour grounded in the brand palette (crisp white, soft sky blue, deep navy accents, warm sunlight) — NOT flat black-and-white, not sterile, not empty clip-art. Include real, relatable, diverse people where it fits — a family, a couple, or a young professional feeling calm and at home — as generic models (never a real, identifiable individual). Strong modern composition with depth, a clean area for a short headline/CTA, and a small tasteful 'SocietyFlats' brand mark. SAFETY: do NOT depict a real, identifiable person, a real named society/building, builder logos, government seals, RERA badges, guaranteed returns, or specific price/availability claims. Draft creative for admin review.";
    }

    /**
     * OpenAI image size that best fits the platform's aspect. gpt-image-1 accepts
     * 1024x1024 / 1024x1536 (portrait) / 1536x1024 (landscape); dall-e stays square for safety.
     */
    private function openAiImageSize(string $platform, string $postType, bool $isDalle): string
    {
        if ($isDalle) {
            return '1024x1024';
        }
        if (in_array($postType, ['story', 'reel', 'whatsapp_status'], true)) {
            return '1024x1536';
        }
        if (in_array($platform, ['linkedin', 'facebook', 'google_business'], true)) {
            return '1536x1024';
        }

        return '1024x1024';
    }

    private function dimensionsFor(string $platform, string $postType): array
    {
        if (in_array($postType, ['story', 'reel', 'whatsapp_status'], true)) {
            return ['width' => 1080, 'height' => 1920];
        }
        if (in_array($platform, ['linkedin', 'facebook', 'google_business'], true)) {
            return ['width' => 1200, 'height' => 628];
        }

        return ['width' => 1080, 'height' => 1080];
    }
}
