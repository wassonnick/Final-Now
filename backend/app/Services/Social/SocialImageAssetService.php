<?php

namespace App\Services\Social;

use App\Models\SocialPost;
use App\Models\SocialPostAsset;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class SocialImageAssetService
{
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
            $response = Http::timeout(90)->withToken($apiKey)->post('https://api.openai.com/v1/images/generations', [
                'model' => $imageModel,
                'prompt' => $this->safeImagePrompt($imagePrompt),
                'size' => '1024x1024',
                'n' => 1,
                'response_format' => 'b64_json',
            ]);

            if (! $response->successful()) {
                throw new \RuntimeException('OpenAI image request failed with HTTP '.$response->status().'.');
            }

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
                'width' => 1024,
                'height' => 1024,
                'status' => 'needs_approval',
                'risk_level' => $post->risk_level,
                'ai_model' => $imageModel,
                'metadata' => $metadata + ['ai_generated' => true],
            ]);
        } catch (\Throwable $e) {
            report($e);

            return $post->assets()->create([
                'asset_type' => 'creative_brief',
                'platform' => $post->platform,
                'image_prompt' => $imagePrompt,
                'status' => 'needs_approval',
                'risk_level' => $post->risk_level,
                'ai_model' => $imageModel,
                'metadata' => $metadata + ['reason' => 'Image generation failed; preserved safe creative brief for review.'],
            ]);
        }
    }

    private function safeImagePrompt(string $prompt): string
    {
        return trim($prompt)."\n\nCreate a branded real-estate marketing graphic or illustration for SocietyFlats.com. Do not create a fake photo of a real society or property. Avoid people faces, builder logos, government seals, RERA badges, guaranteed returns, misleading price or availability claims. The visual must be clearly suitable as a draft creative for admin review.";
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
