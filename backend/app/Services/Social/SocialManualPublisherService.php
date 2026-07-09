<?php

namespace App\Services\Social;

use App\Models\SocialAccount;
use App\Models\SocialPost;
use App\Models\SocialPostAsset;
use App\Models\SocialPublishLog;
use Illuminate\Support\Facades\Http;
use InvalidArgumentException;

class SocialManualPublisherService
{
    public function publish(SocialPost $post, array $options = [], ?string $actor = null): array
    {
        $platform = $this->accountPlatform($post->platform);

        if ($platform === 'whatsapp_business') {
            return $this->whatsappExport($post, $actor);
        }

        $this->validatePublishGate($post, $options);

        $account = $this->accountFor($platform, $options['social_account_id'] ?? null);
        $asset = $this->validatedAsset($post, in_array($platform, ['instagram_business', 'facebook_page'], true));

        $this->log($post, $account, 'manual_publish_attempt', 'started', $actor, 'Manual publish requested.');

        try {
            $result = match ($platform) {
                'instagram_business' => $this->publishInstagram($post, $account, $asset),
                'facebook_page' => $this->publishFacebook($post, $account, $asset),
                'linkedin' => $this->publishLinkedIn($post, $account, $asset),
                'google_business_profile' => $this->publishGoogleBusiness($post, $account, $asset),
                default => throw new InvalidArgumentException('Unsupported publishing platform.'),
            };

            $post->update([
                'social_account_id' => $account->id,
                'status' => 'published',
                'publish_status' => 'published',
                'publish_error' => null,
                'posted_at' => now(),
                'external_post_id' => $result['external_post_id'] ?? null,
                'external_post_url' => $result['external_post_url'] ?? null,
                'publish_metadata' => $result['metadata'] ?? [],
            ]);

            $this->log($post->fresh(), $account, 'manual_publish', 'published', $actor, 'Post published manually.', [
                'external_post_id' => $result['external_post_id'] ?? null,
            ]);

            return ['mode' => 'published', 'post' => $post->fresh()->load('assets')];
        } catch (\Throwable $e) {
            $message = $this->safeError($e->getMessage());
            $post->update(['publish_status' => 'failed', 'publish_error' => $message]);
            $account->update(['last_error' => $message]);
            $this->log($post->fresh(), $account, 'manual_publish', 'failed', $actor, $message);

            throw new InvalidArgumentException($message);
        }
    }

    private function validatePublishGate(SocialPost $post, array $options): void
    {
        if ($post->status !== 'approved') {
            throw new InvalidArgumentException('Only approved social posts can be manually published.');
        }

        if (! (bool) ($options['confirm_publish'] ?? false)) {
            throw new InvalidArgumentException('Final publish confirmation is required.');
        }

        if ($post->risk_level === 'high' && ! (bool) ($options['confirm_high_risk'] ?? false)) {
            throw new InvalidArgumentException('High-risk posts require explicit high-risk confirmation before manual publishing.');
        }

        if ($post->posted_at || $post->publish_status === 'published') {
            throw new InvalidArgumentException('This social post has already been published.');
        }
    }

    private function accountFor(string $platform, ?int $accountId): SocialAccount
    {
        $query = SocialAccount::where('platform', $platform);
        if ($accountId) {
            $query->whereKey($accountId);
        }

        $account = $query->first();
        if (! $account || $account->status !== 'connected' || ! $account->accessToken()) {
            throw new InvalidArgumentException('Connect an authorized '.$platform.' account before publishing.');
        }

        if ($platform === 'google_business_profile' && ! (bool) data_get($account->metadata, 'verified_location')) {
            throw new InvalidArgumentException('Google Business Profile publishing requires a verified, authorized location.');
        }

        return $account;
    }

    private function validatedAsset(SocialPost $post, bool $required): ?SocialPostAsset
    {
        $asset = $post->assets()
            ->where('status', 'approved')
            ->whereNotNull('public_url')
            ->latest()
            ->first();

        if ($required && (! $asset || ! filter_var($asset->public_url, FILTER_VALIDATE_URL))) {
            throw new InvalidArgumentException('Instagram/Facebook publishing requires an approved, publicly accessible media asset.');
        }

        return $asset;
    }

    private function publishInstagram(SocialPost $post, SocialAccount $account, ?SocialPostAsset $asset): array
    {
        $igUserId = data_get($account->metadata, 'instagram_business_account_id', $account->account_id);
        if (! $igUserId) {
            throw new InvalidArgumentException('Instagram Business account ID is missing.');
        }

        $container = Http::post("https://graph.facebook.com/v20.0/{$igUserId}/media", [
            'image_url' => $asset?->public_url,
            'caption' => $this->caption($post),
            'access_token' => $account->accessToken(),
        ]);

        if (! $container->successful() || ! $container->json('id')) {
            throw new InvalidArgumentException('Instagram media container creation failed.');
        }

        $publish = Http::post("https://graph.facebook.com/v20.0/{$igUserId}/media_publish", [
            'creation_id' => $container->json('id'),
            'access_token' => $account->accessToken(),
        ]);

        if (! $publish->successful() || ! $publish->json('id')) {
            throw new InvalidArgumentException('Instagram manual publish failed.');
        }

        return ['external_post_id' => (string) $publish->json('id'), 'metadata' => ['container_id' => $container->json('id')]];
    }

    private function publishFacebook(SocialPost $post, SocialAccount $account, ?SocialPostAsset $asset): array
    {
        $pageId = $account->account_id ?: data_get($account->metadata, 'page_id');
        if (! $pageId) {
            throw new InvalidArgumentException('Facebook Page ID is missing.');
        }

        $endpoint = $asset ? "https://graph.facebook.com/v20.0/{$pageId}/photos" : "https://graph.facebook.com/v20.0/{$pageId}/feed";
        $payload = $asset
            ? ['url' => $asset->public_url, 'caption' => $this->caption($post), 'access_token' => $account->accessToken()]
            : ['message' => $this->caption($post), 'access_token' => $account->accessToken()];

        $response = Http::post($endpoint, $payload);
        if (! $response->successful() || ! ($response->json('post_id') || $response->json('id'))) {
            throw new InvalidArgumentException('Facebook manual publish failed.');
        }

        return ['external_post_id' => (string) ($response->json('post_id') ?: $response->json('id'))];
    }

    private function publishLinkedIn(SocialPost $post, SocialAccount $account, ?SocialPostAsset $asset): array
    {
        $author = $account->account_id ?: data_get($account->metadata, 'author_urn');
        if (! $author) {
            throw new InvalidArgumentException('LinkedIn author URN is missing.');
        }

        $response = Http::withToken($account->accessToken())
            ->withHeaders(['LinkedIn-Version' => '202406', 'X-Restli-Protocol-Version' => '2.0.0'])
            ->post('https://api.linkedin.com/rest/posts', [
                'author' => $author,
                'commentary' => $this->caption($post),
                'visibility' => 'PUBLIC',
                'distribution' => [
                    'feedDistribution' => 'MAIN_FEED',
                    'targetEntities' => [],
                    'thirdPartyDistributionChannels' => [],
                ],
                'lifecycleState' => 'PUBLISHED',
                'isReshareDisabledByAuthor' => false,
            ]);

        if (! $response->successful()) {
            throw new InvalidArgumentException('LinkedIn manual publish failed.');
        }

        return ['external_post_id' => (string) ($response->header('x-restli-id') ?: $response->json('id'))];
    }

    private function publishGoogleBusiness(SocialPost $post, SocialAccount $account, ?SocialPostAsset $asset): array
    {
        $location = data_get($account->metadata, 'location_name');
        if (! $location) {
            throw new InvalidArgumentException('Google Business Profile location is missing.');
        }

        $response = Http::withToken($account->accessToken())->post("https://mybusiness.googleapis.com/v4/{$location}/localPosts", [
            'languageCode' => 'en',
            'summary' => $this->caption($post),
            'topicType' => 'STANDARD',
        ]);

        if (! $response->successful() || ! $response->json('name')) {
            throw new InvalidArgumentException('Google Business Profile manual publish failed.');
        }

        return ['external_post_id' => (string) $response->json('name')];
    }

    private function whatsappExport(SocialPost $post, ?string $actor): array
    {
        if ($post->status !== 'approved') {
            throw new InvalidArgumentException('Only approved WhatsApp drafts can be exported.');
        }

        $asset = $post->assets()->where('status', 'approved')->latest()->first();
        $post->update([
            'publish_status' => 'manual_export_ready',
            'publish_error' => null,
            'publish_metadata' => [
                'manual_status_export_only' => true,
                'copy' => $this->caption($post),
                'asset_url' => $asset?->public_url,
            ],
        ]);

        $this->log($post->fresh(), null, 'whatsapp_manual_export', 'ready', $actor, 'WhatsApp manual export prepared.');

        return [
            'mode' => 'manual_export',
            'copy' => $this->caption($post),
            'asset_url' => $asset?->public_url,
            'post' => $post->fresh()->load('assets'),
        ];
    }

    private function accountPlatform(string $postPlatform): string
    {
        return match ($postPlatform) {
            'instagram', 'instagram_business' => 'instagram_business',
            'facebook', 'facebook_page' => 'facebook_page',
            'linkedin' => 'linkedin',
            'google_business', 'google_business_profile' => 'google_business_profile',
            'whatsapp', 'whatsapp_business' => 'whatsapp_business',
            default => throw new InvalidArgumentException('Unsupported publishing platform.'),
        };
    }

    private function caption(SocialPost $post): string
    {
        $parts = array_filter([$post->caption, $post->cta, collect($post->hashtags ?: [])->implode(' ')]);

        return trim(implode("\n\n", $parts));
    }

    private function log(?SocialPost $post, ?SocialAccount $account, string $action, string $status, ?string $actor, ?string $message = null, array $metadata = []): void
    {
        SocialPublishLog::create([
            'social_post_id' => $post?->id,
            'social_account_id' => $account?->id,
            'platform' => $account?->platform ?: $post?->platform ?: 'unknown',
            'action' => $action,
            'status' => $status,
            'actor' => $actor,
            'external_post_id' => $post?->external_post_id,
            'message' => $message,
            'metadata' => $metadata,
        ]);
    }

    private function safeError(string $message): string
    {
        $message = preg_replace('/access_token=[^&\s]+/i', 'access_token=[redacted]', $message) ?: $message;
        $message = preg_replace('/Bearer\s+[A-Za-z0-9._~-]+/i', 'Bearer [redacted]', $message) ?: $message;

        return mb_substr($message, 0, 500);
    }
}
