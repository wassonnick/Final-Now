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

        $account = $this->accountFor($platform, $options['social_account_id'] ?? null);

        $this->validatePublishGate($post, $options, $account, $platform, 'manual_publish', $actor);

        return $this->send($post, $account, $platform, 'manual_publish', $actor);
    }

    /**
     * Autopilot path: no human confirmation, so the gates are stricter — approved LOW-risk
     * posts only, never WhatsApp (manual export only), never a repeat publish. Everything
     * else reuses the exact same platform send + logging as the manual path.
     */
    public function publishAutomatically(SocialPost $post): array
    {
        $platform = $this->accountPlatform($post->platform);

        if ($platform === 'whatsapp_business') {
            throw new InvalidArgumentException('WhatsApp posts are manual-export only and cannot auto-publish.');
        }
        if ($post->status !== 'approved') {
            throw new InvalidArgumentException('Only approved posts can auto-publish.');
        }
        if ($post->risk_level !== 'low') {
            throw new InvalidArgumentException('Only low-risk posts may auto-publish; this one needs a human.');
        }
        if ($post->posted_at || $post->publish_status === 'published') {
            throw new InvalidArgumentException('This social post has already been published.');
        }

        $account = $this->accountFor($platform, $post->social_account_id);

        return $this->send($post, $account, $platform, 'autopilot_publish', 'autopilot');
    }

    private function send(SocialPost $post, SocialAccount $account, string $platform, string $action, ?string $actor): array
    {
        $this->ensurePublishingScopes($post, $account, $platform, $action, $actor);

        $asset = $this->validatedAsset($post, $account, $platform, $action, $actor, in_array($platform, ['instagram_business', 'facebook_page'], true));

        $this->log($post, $account, $action.'_attempt', 'started', $actor, 'Publish requested.');

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

            $this->log($post->fresh(), $account, $action, 'published', $actor, 'Post published.', [
                'external_post_id' => $result['external_post_id'] ?? null,
            ]);

            return ['mode' => 'published', 'post' => $post->fresh()->load('assets')];
        } catch (\Throwable $e) {
            $message = $this->safeError($e->getMessage());
            $post->update(['publish_status' => 'failed', 'publish_error' => $message]);
            $account->update(['last_error' => $message]);
            $this->log($post->fresh(), $account, $action, 'failed', $actor, $message);

            throw new InvalidArgumentException($message);
        }
    }

    private function ensurePublishingScopes(SocialPost $post, SocialAccount $account, string $platform, string $action, ?string $actor): void
    {
        $required = match ($platform) {
            'facebook_page' => ['pages_manage_posts'],
            'instagram_business' => ['instagram_content_publish'],
            default => [],
        };

        if (! $required) {
            return;
        }

        if ($this->hasRequiredPublishScope($account, $platform, $required[0])) {
            return;
        }

        $missing = $required;
        $message = match ($platform) {
            'facebook_page' => 'Facebook publish blocked: pages_manage_posts permission is not granted.',
            'instagram_business' => 'Instagram publish blocked: instagram_content_publish permission is not granted.',
            default => 'Meta publish blocked: required publishing permission is not granted.',
        };
        $post->update(['publish_status' => 'failed', 'publish_error' => $message]);
        $account->update(['last_error' => $message]);
        $this->log($post->fresh(), $account, $action.'_blocked', 'blocked', $actor, $message, [
            'reason' => 'missing_scope',
            'missing_scopes' => $missing,
        ]);

        throw new InvalidArgumentException($message);
    }

    private function hasRequiredPublishScope(SocialAccount $account, string $platform, string $scope): bool
    {
        $granted = array_map('strval', $account->scopes ?: []);
        if (in_array($scope, $granted, true)) {
            return true;
        }

        return match ($platform) {
            'facebook_page' => (bool) data_get($account->metadata, 'facebook_publish_scope_granted'),
            'instagram_business' => (bool) data_get($account->metadata, 'instagram_publish_scope_granted'),
            default => false,
        };
    }

    private function validatePublishGate(SocialPost $post, array $options, SocialAccount $account, string $platform, string $action, ?string $actor): void
    {
        if ($post->status !== 'approved') {
            $message = 'Only approved social posts can be manually published.';
            $this->log($post, $account, $action.'_blocked', 'blocked', $actor, $message, [
                'reason' => 'missing_approval',
                'platform' => $platform,
            ]);
            throw new InvalidArgumentException($message);
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
        if (! $account || ! in_array($account->status, ['connected', 'connected_manual_page'], true) || ! $account->accessToken()) {
            throw new InvalidArgumentException('Connect an authorized '.$platform.' account before publishing.');
        }

        if ($platform === 'google_business_profile' && ! (bool) data_get($account->metadata, 'verified_location')) {
            throw new InvalidArgumentException('Google Business Profile publishing requires a verified, authorized location.');
        }

        return $account;
    }

    private function validatedAsset(SocialPost $post, SocialAccount $account, string $platform, string $action, ?string $actor, bool $required): ?SocialPostAsset
    {
        $asset = $post->assets()
            ->where('status', 'approved')
            ->whereNotNull('public_url')
            ->latest()
            ->first();

        if ($required && (! $asset || ! filter_var($asset->public_url, FILTER_VALIDATE_URL))) {
            $message = $platform === 'instagram_business'
                ? 'Instagram publish blocked: approved image asset required.'
                : 'Facebook publish blocked: approved image asset required.';
            $post->update(['publish_status' => 'failed', 'publish_error' => $message]);
            $account->update(['last_error' => $message]);
            $this->log($post->fresh(), $account, $action.'_blocked', 'blocked', $actor, $message, [
                'reason' => 'missing_asset',
            ]);

            throw new InvalidArgumentException($message);
        }

        return $asset;
    }

    private function publishInstagram(SocialPost $post, SocialAccount $account, ?SocialPostAsset $asset): array
    {
        $igUserId = data_get($account->metadata, 'instagram_business_account_id', $account->account_id);
        if (! $igUserId) {
            throw new InvalidArgumentException('Instagram Business account ID is missing.');
        }

        // Instagram Graph publishing goes through the linked Facebook Page, so it needs that
        // Page's access token. connected_facebook_page_id can be blank when Meta returned no
        // pages and the Page was entered manually (its account_id was null at IG-sync time),
        // so fall back to the Facebook account's own resolved page id, then to its selected page.
        $linkedPageId = (string) data_get($account->metadata, 'connected_facebook_page_id', '');
        if ($linkedPageId === '') {
            $facebook = SocialAccount::where('platform', 'facebook_page')->first();
            $linkedPageId = (string) ($facebook?->account_id
                ?: data_get($facebook?->metadata, 'selected_page_id', '')
                ?: data_get($account->metadata, 'selected_page_id', ''));
        }
        // The Page token must come from the Facebook account that holds pages_manage_posts.
        // Without a linked Page there is no valid publishing token — fail clearly here rather
        // than let Meta reject the user token with a cryptic "(#10) ... permission" error.
        $tokenAccount = SocialAccount::where('platform', 'facebook_page')->first() ?: $account;
        if ($linkedPageId === '') {
            throw new InvalidArgumentException('Instagram publish blocked: no linked Facebook Page resolved. Connect the Facebook Page (with pages_manage_posts) that owns this Instagram account, then retry.');
        }
        $token = $this->facebookPageToken($tokenAccount, $linkedPageId);

        $container = Http::post("https://graph.facebook.com/v20.0/{$igUserId}/media", [
            'image_url' => $asset?->public_url,
            'caption' => $this->caption($post),
            'access_token' => $token,
        ]);

        if (! $container->successful() || ! $container->json('id')) {
            throw new InvalidArgumentException('Instagram media container creation failed: '.$this->safeError((string) $container->body()));
        }

        $publish = Http::post("https://graph.facebook.com/v20.0/{$igUserId}/media_publish", [
            'creation_id' => $container->json('id'),
            'access_token' => $token,
        ]);

        if (! $publish->successful() || ! $publish->json('id')) {
            throw new InvalidArgumentException('Instagram manual publish failed: '.$this->safeError((string) $publish->body()));
        }

        return ['external_post_id' => (string) $publish->json('id'), 'metadata' => ['container_id' => $container->json('id')]];
    }

    private function publishFacebook(SocialPost $post, SocialAccount $account, ?SocialPostAsset $asset): array
    {
        // account_id can be cleared if the account is later re-connected in connect-only mode;
        // fall back to the manually selected page so a working page id still resolves.
        $pageId = $account->account_id
            ?: data_get($account->metadata, 'page_id')
            ?: data_get($account->metadata, 'selected_page_id');
        if (! $pageId) {
            throw new InvalidArgumentException('Facebook Page ID is missing.');
        }

        // Posting to a Page's feed requires a PAGE access token, not the connecting user's
        // token — derive it from the user token (works even when the Page was entered manually).
        $pageToken = $this->facebookPageToken($account, (string) $pageId);

        $endpoint = $asset ? "https://graph.facebook.com/v20.0/{$pageId}/photos" : "https://graph.facebook.com/v20.0/{$pageId}/feed";
        $payload = $asset
            ? ['url' => $asset->public_url, 'caption' => $this->caption($post), 'access_token' => $pageToken]
            : ['message' => $this->caption($post), 'access_token' => $pageToken];

        $response = Http::post($endpoint, $payload);
        if (! $response->successful() || ! ($response->json('post_id') || $response->json('id'))) {
            throw new InvalidArgumentException('Facebook manual publish failed: '.$this->safeError((string) $response->body()));
        }

        return ['external_post_id' => (string) ($response->json('post_id') ?: $response->json('id'))];
    }

    /**
     * Facebook Page publishing needs a Page access token. The Graph API returns one for any Page
     * the connecting user manages via GET /{page-id}?fields=access_token with the user token.
     * Resolved per publish (never cached in metadata, which is returned to the frontend). Falls
     * back to the user token so a real Graph error surfaces instead of a silent swap.
     */
    private function facebookPageToken(SocialAccount $account, string $pageId): string
    {
        $userToken = (string) $account->accessToken();
        if ($pageId === '' || $userToken === '') {
            return $userToken;
        }

        try {
            $response = Http::get("https://graph.facebook.com/v20.0/{$pageId}", [
                'fields' => 'access_token',
                'access_token' => $userToken,
            ]);
            $pageToken = $response->successful() ? (string) $response->json('access_token', '') : '';

            return $pageToken !== '' ? $pageToken : $userToken;
        } catch (\Throwable) {
            return $userToken;
        }
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
