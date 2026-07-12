<?php

namespace App\Services\Social;

use App\Models\SocialAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use InvalidArgumentException;

class SocialOAuthService
{
    public const PLATFORMS = [
        'instagram_business' => 'Instagram Business',
        'facebook_page' => 'Facebook Page',
        'linkedin' => 'LinkedIn Page/Profile',
        'google_business_profile' => 'Google Business Profile',
        'whatsapp_business' => 'WhatsApp Business',
    ];

    public function ensureAccounts(): void
    {
        foreach (self::PLATFORMS as $platform => $label) {
            SocialAccount::firstOrCreate(
                ['platform' => $platform],
                ['account_name' => $label, 'status' => 'not_connected', 'metadata' => ['sm2_manual_only' => true]]
            );
        }
    }

    public function start(string $platform, string $mode = 'connect'): array
    {
        $this->assertPlatform($platform);
        $mode = $this->normalizeMode($platform, $mode);
        $account = SocialAccount::firstOrCreate(['platform' => $platform], ['account_name' => self::PLATFORMS[$platform]]);

        if ($platform === 'whatsapp_business') {
            $account->update([
                'status' => 'manual_export_only',
                'metadata' => array_merge($account->metadata ?: [], ['manual_status_export_only' => true]),
            ]);

            return [
                'platform' => $platform,
                'mode' => 'manual_export_only',
                'message' => 'WhatsApp Business API is messaging-oriented. SM2 provides downloadable creative/copy only; no Status auto-posting.',
            ];
        }

        $state = Str::random(48);
        $account->update([
            'oauth_state' => $state,
            'last_error' => null,
            'metadata' => array_merge($account->metadata ?: [], ['oauth_mode' => $mode]),
        ]);

        return [
            'platform' => $platform,
            'mode' => $mode,
            'authorization_url' => $this->authorizationUrl($platform, $state, $mode),
            'state' => $state,
            'redirect_uri' => $this->redirectUri(),
            'scopes' => $this->scopes($platform, $mode),
        ];
    }

    public function metaPublishReviewUrl(): array
    {
        $account = SocialAccount::firstOrCreate(
            ['platform' => 'facebook_page'],
            ['account_name' => self::PLATFORMS['facebook_page'], 'status' => 'not_connected']
        );

        $state = $this->statePayload('publish_review', 'meta');
        $account->update([
            'oauth_state' => $state,
            'last_error' => null,
            'metadata' => array_merge($account->metadata ?: [], [
                'oauth_mode' => 'publish_review',
                'publish_review_requested_at' => now()->toISOString(),
                'publish_review_platform' => 'meta',
            ]),
        ]);

        return [
            'platform' => 'meta',
            'mode' => 'publish_review',
            'authorization_url' => $this->authorizationUrl('facebook_page', $state, 'publish_review'),
            'state' => $state,
            'redirect_uri' => $this->redirectUri(),
            'scopes' => $this->scopes('facebook_page', 'publish_review'),
        ];
    }

    public function callback(?string $platform, string $code, string $state): SocialAccount
    {
        if ($platform) {
            $this->assertPlatform($platform);
        }

        $account = SocialAccount::query()
            ->when($platform, fn ($query) => $query->where('platform', $platform))
            ->where('oauth_state', $state)
            ->firstOrFail();

        if (! $account->oauth_state || ! hash_equals($account->oauth_state, $state)) {
            throw new InvalidArgumentException('OAuth state mismatch. Please restart the connection.');
        }

        $token = $this->exchangeCode($account->platform, $code);
        $metadata = array_merge($account->metadata ?: [], [
            'sm2_manual_only' => true,
            'token_type' => $token['token_type'] ?? null,
            'connected_via' => 'oauth',
            'oauth_mode' => data_get($account->metadata, 'oauth_mode', 'connect'),
        ]);
        $grantedScopes = $this->grantedScopes($account->platform, $token, (string) data_get($metadata, 'oauth_mode', 'connect'));

        if (data_get($metadata, 'oauth_mode') === 'publish_review' && $account->platform === 'facebook_page') {
            return $this->completeMetaPublishReview($account, $token, $grantedScopes, $metadata);
        }

        // Keep the publish flags honest with the token we just received. Re-connecting in
        // connect-only mode returns a token without the publish scope, so a previously-granted
        // flag must be cleared — otherwise the UI (and the publisher's fallback) trusts a stale
        // "granted" while the live token can't actually publish.
        if (in_array($account->platform, ['facebook_page', 'instagram_business'], true)) {
            $fbGranted = in_array('pages_manage_posts', $grantedScopes, true);
            $igGranted = in_array('instagram_content_publish', $grantedScopes, true);
            $metadata = array_merge($metadata, [
                'facebook_publish_scope_granted' => $fbGranted,
                'instagram_publish_scope_granted' => $igGranted,
                'publish_enabled' => $account->platform === 'facebook_page' ? $fbGranted : $igGranted,
            ]);
        }

        $account->fill([
            'status' => $account->platform === 'google_business_profile' ? 'needs_location_verification' : 'connected',
            'oauth_state' => null,
            'last_connected_at' => now(),
            'last_error' => null,
            'scopes' => $grantedScopes,
            'token_expires_at' => isset($token['expires_in']) ? now()->addSeconds((int) $token['expires_in']) : null,
            'metadata' => $metadata,
        ]);
        $account->access_token = (string) ($token['access_token'] ?? '');
        $account->refresh_token = $token['refresh_token'] ?? null;
        $account->save();

        if ($account->platform === 'facebook_page') {
            return $this->syncMetaPages($account);
        }

        return $account;
    }

    public function selectMetaPage(string $pageId): SocialAccount
    {
        $account = SocialAccount::where('platform', 'facebook_page')->firstOrFail();
        $pages = data_get($account->metadata, 'available_pages', []);
        $page = collect(is_array($pages) ? $pages : [])
            ->first(fn ($candidate) => (string) data_get($candidate, 'id') === (string) $pageId);

        if (! is_array($page)) {
            throw new InvalidArgumentException('Selected Facebook Page was not found in the connected Meta account.');
        }

        return $this->saveSelectedFacebookPage($account, $page);
    }

    public function selectMetaPageFromGraph(
        string $pageId,
        ?string $pageName = null,
        bool $manualFallbackConfirmed = false,
        ?string $instagramId = null,
        ?string $instagramHandle = null,
    ): SocialAccount
    {
        $account = $this->facebookAccountWithToken();
        $metadataPage = $this->findStoredAvailableMetaPage($account, $pageId);

        if ($metadataPage) {
            $saved = $this->saveSelectedFacebookPage($account, $metadataPage, 'available_pages');
            $this->saveManualInstagramIfProvided($manualFallbackConfirmed, $saved, $instagramId, $instagramHandle);

            return $saved->fresh();
        }

        $inventory = $this->metaPageInventory($account);
        $page = $this->findMetaPage($inventory, $pageId);

        if ($page) {
            $saved = $this->saveSelectedFacebookPage($account, $this->pageForSave($page), (string) data_get($page, 'source', 'business_asset_fallback'));
            $this->saveManualInstagramIfProvided($manualFallbackConfirmed, $saved, $instagramId, $instagramHandle);

            return $saved->fresh();
        }

        if ($manualFallbackConfirmed) {
            return $this->saveManualFacebookPage($account, $pageId, (string) $pageName, $instagramId, $instagramHandle);
        }

        throw new InvalidArgumentException('Selected Facebook Page was not found in Meta Page or Business assets. Manual fallback requires explicit confirmation.');
    }

    public function debugMetaPages(): array
    {
        try {
            $account = $this->facebookAccountWithToken();
        } catch (InvalidArgumentException $e) {
            $account = SocialAccount::where('platform', 'facebook_page')->first();

            return [
                'me' => null,
                'granted_scopes' => $account?->scopes ?: [],
                'business_management_required' => true,
                'business_management_message' => 'Business Portfolio lookup requires Meta business_management permission. Reconnect Meta after adding this scope.',
                'pages_count_from_me_accounts' => 0,
                'businesses_count' => 0,
                'businesses' => [],
                'last_error' => $e->getMessage(),
            ];
        }

        $inventory = $this->metaPageInventory($account);
        $societyFlatsPage = $this->findSocietyFlatsPage($inventory);

        if ($societyFlatsPage && data_get($societyFlatsPage, 'source') !== 'me_accounts') {
            $account = $this->saveSelectedFacebookPage($account, $this->pageForSave($societyFlatsPage), 'business_asset_fallback');
        }

        $missingBusinessManagement = ! in_array('business_management', $account->scopes ?: [], true);

        $debug = $this->safeMetaInventoryForDebug($inventory);
        $debug = array_merge($debug, [
            'granted_scopes' => $account->scopes ?: [],
            'business_management_required' => $missingBusinessManagement,
            'business_management_message' => $missingBusinessManagement
                ? 'Business Portfolio lookup requires Meta business_management permission. Reconnect Meta after adding this scope.'
                : null,
            'last_error' => $missingBusinessManagement
                ? 'Business Portfolio lookup requires Meta business_management permission. Reconnect Meta after adding this scope.'
                : ($debug['last_error'] ?: $account->last_error),
        ]);

        return $debug;
    }

    private function authorizationUrl(string $platform, string $state, string $mode = 'connect'): string
    {
        return match ($platform) {
            'instagram_business', 'facebook_page' => 'https://www.facebook.com/v20.0/dialog/oauth?'.http_build_query([
                'client_id' => config('services.social_oauth.meta_client_id'),
                'redirect_uri' => $this->redirectUri(),
                'state' => $state,
                'response_type' => 'code',
                'scope' => implode(',', $this->scopes($platform, $mode)),
            ]),
            'linkedin' => 'https://www.linkedin.com/oauth/v2/authorization?'.http_build_query([
                'client_id' => config('services.social_oauth.linkedin_client_id'),
                'redirect_uri' => $this->redirectUri(),
                'state' => $state,
                'response_type' => 'code',
                'scope' => implode(' ', $this->scopes($platform, $mode)),
            ]),
            'google_business_profile' => 'https://accounts.google.com/o/oauth2/v2/auth?'.http_build_query([
                'client_id' => config('services.social_oauth.google_client_id'),
                'redirect_uri' => $this->redirectUri(),
                'state' => $state,
                'response_type' => 'code',
                'access_type' => 'offline',
                'prompt' => 'consent',
                'scope' => implode(' ', $this->scopes($platform, $mode)),
            ]),
            default => throw new InvalidArgumentException('Unsupported social platform.'),
        };
    }

    private function exchangeCode(string $platform, string $code): array
    {
        $response = match ($platform) {
            'instagram_business', 'facebook_page' => Http::asForm()->post('https://graph.facebook.com/v20.0/oauth/access_token', [
                'client_id' => config('services.social_oauth.meta_client_id'),
                'client_secret' => config('services.social_oauth.meta_client_secret'),
                'redirect_uri' => $this->redirectUri(),
                'code' => $code,
            ]),
            'linkedin' => Http::asForm()->post('https://www.linkedin.com/oauth/v2/accessToken', [
                'grant_type' => 'authorization_code',
                'code' => $code,
                'redirect_uri' => $this->redirectUri(),
                'client_id' => config('services.social_oauth.linkedin_client_id'),
                'client_secret' => config('services.social_oauth.linkedin_client_secret'),
            ]),
            'google_business_profile' => Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'authorization_code',
                'code' => $code,
                'redirect_uri' => $this->redirectUri(),
                'client_id' => config('services.social_oauth.google_client_id'),
                'client_secret' => config('services.social_oauth.google_client_secret'),
            ]),
            default => throw new InvalidArgumentException('Unsupported social platform.'),
        };

        if (! $response->successful() || ! $response->json('access_token')) {
            throw new InvalidArgumentException('OAuth token exchange failed. Check app credentials and platform permissions.');
        }

        return $response->json();
    }

    public function scopes(string $platform, string $mode = 'connect'): array
    {
        return match ($platform) {
            'instagram_business', 'facebook_page' => $this->metaScopes($mode, $platform),
            'linkedin' => ['openid', 'profile', 'w_member_social'],
            'google_business_profile' => ['https://www.googleapis.com/auth/business.manage'],
            default => [],
        };
    }

    /**
     * Publish scopes are requested PER PLATFORM. Meta rejects an entire OAuth dialog if any one
     * scope is invalid ("Invalid Scopes: instagram_content_publish") — so bundling the Facebook
     * and Instagram publish scopes meant an un-enabled Instagram permission also blocked the
     * perfectly valid Facebook one. Authorizing each platform on its own keeps Facebook working
     * while Instagram waits on its app-product setup.
     */
    private function metaScopes(string $mode, string $platform = 'facebook_page'): array
    {
        $publishMode = in_array($mode, ['publish', 'publish_review'], true);

        if (! $publishMode) {
            return $this->parseScopes((string) config('services.social_oauth.meta_connect_scopes', 'public_profile,pages_show_list,pages_read_engagement,business_management'));
        }

        $fallback = $platform === 'instagram_business'
            ? 'instagram_basic,instagram_content_publish'
            : 'pages_manage_posts';
        $key = $platform === 'instagram_business' ? 'meta_ig_publish_scopes' : 'meta_fb_publish_scopes';

        return $this->parseScopes((string) config("services.social_oauth.{$key}", $fallback));
    }

    private function parseScopes(string $raw): array
    {
        return array_values(array_unique(array_filter(array_map(
            static fn ($scope) => trim((string) $scope),
            preg_split('/[\s,]+/', $raw) ?: []
        ))));
    }

    private function grantedScopes(string $platform, array $token, string $mode): array
    {
        $scope = $token['scope'] ?? $token['granted_scopes'] ?? null;
        if (is_string($scope) && trim($scope) !== '') {
            return array_values(array_unique(preg_split('/[\s,]+/', trim($scope)) ?: []));
        }

        if (is_array($scope)) {
            return array_values(array_unique(array_map('strval', $scope)));
        }

        return $this->scopes($platform, $mode);
    }

    private function normalizeMode(string $platform, string $mode): string
    {
        if (! in_array($platform, ['instagram_business', 'facebook_page'], true)) {
            return 'connect';
        }

        return $mode === 'publish' ? 'publish' : 'connect';
    }

    private function completeMetaPublishReview(SocialAccount $facebookAccount, array $token, array $grantedScopes, array $metadata): SocialAccount
    {
        $expiresAt = isset($token['expires_in']) ? now()->addSeconds((int) $token['expires_in']) : $facebookAccount->token_expires_at;
        $facebookGranted = in_array('pages_manage_posts', $grantedScopes, true);
        $instagramGranted = in_array('instagram_content_publish', $grantedScopes, true);
        $reviewMetadata = array_merge($metadata, [
            'publish_review_completed_at' => now()->toISOString(),
            'publish_review_requested' => true,
            'facebook_publish_scope_granted' => $facebookGranted,
            'instagram_publish_scope_granted' => $instagramGranted,
        ]);

        $facebookAccount->fill([
            'status' => $facebookGranted ? 'connected' : $facebookAccount->status,
            'oauth_state' => null,
            'last_connected_at' => now(),
            'last_error' => $facebookGranted ? null : 'Meta publish permission not granted yet.',
            'scopes' => $this->mergeScopes($facebookAccount->scopes ?: [], $grantedScopes),
            'token_expires_at' => $expiresAt,
            'metadata' => array_merge($reviewMetadata, [
                'publish_enabled' => $facebookGranted,
                'facebook_publish_scope_granted' => $facebookGranted,
            ]),
        ]);
        $facebookAccount->access_token = (string) ($token['access_token'] ?? $facebookAccount->accessToken() ?? '');
        $facebookAccount->refresh_token = $token['refresh_token'] ?? $facebookAccount->refreshToken();
        $facebookAccount->save();

        $instagram = SocialAccount::firstOrCreate(
            ['platform' => 'instagram_business'],
            ['account_name' => self::PLATFORMS['instagram_business'], 'status' => 'not_connected', 'metadata' => ['sm2_manual_only' => true]]
        );
        $instagram->fill([
            'status' => $instagramGranted ? 'connected' : $instagram->status,
            'last_connected_at' => now(),
            'last_error' => $instagramGranted ? null : 'Meta publish permission not granted yet.',
            'scopes' => $this->mergeScopes($instagram->scopes ?: [], $grantedScopes),
            'token_expires_at' => $expiresAt,
            'metadata' => array_merge($instagram->metadata ?: [], [
                'sm2_manual_only' => true,
                'connected_via' => 'oauth',
                'oauth_mode' => 'publish_review',
                'publish_review_requested' => true,
                'publish_review_completed_at' => now()->toISOString(),
                'connected_facebook_page_id' => $facebookAccount->account_id,
                'instagram_publish_scope_granted' => $instagramGranted,
                'publish_enabled' => $instagramGranted,
            ]),
        ]);
        $instagram->access_token = (string) ($token['access_token'] ?? $instagram->accessToken() ?? '');
        $instagram->refresh_token = $token['refresh_token'] ?? $instagram->refreshToken();
        $instagram->save();

        return $facebookAccount->fresh();
    }

    private function mergeScopes(array $existingScopes, array $newScopes): array
    {
        return array_values(array_unique(array_filter(array_map(
            static fn ($scope) => trim((string) $scope),
            array_merge($existingScopes, $newScopes)
        ))));
    }

    private function statePayload(string $mode, string $platform): string
    {
        $payload = rtrim(strtr(base64_encode(json_encode([
            'mode' => $mode,
            'platform' => $platform,
            'nonce' => Str::random(32),
        ]) ?: ''), '+/', '-_'), '=');

        return $payload.'.'.Str::random(16);
    }

    private function redirectUri(): string
    {
        return (string) config('services.social_oauth.redirect_uri');
    }

    private function assertPlatform(string $platform): void
    {
        if (! array_key_exists($platform, self::PLATFORMS)) {
            throw new InvalidArgumentException('Unsupported social platform.');
        }
    }

    private function syncMetaPages(SocialAccount $account): SocialAccount
    {
        try {
            $response = Http::get('https://graph.facebook.com/v20.0/me/accounts', [
                'fields' => 'id,name,username,instagram_business_account{id,username,name}',
                'access_token' => $account->accessToken(),
            ]);

            if (! $response->successful()) {
                return $this->markMetaPageFetchFailed($account, 'Meta connected, but Facebook Pages could not be fetched. Check pages_show_list permission and Page access.');
            }

            $pages = $this->safeMetaPages($response->json('data', []));
        } catch (\Throwable) {
            return $this->markMetaPageFetchFailed($account, 'Meta connected, but Facebook Pages could not be fetched. Check pages_show_list permission and Page access.');
        }

        if (count($pages) === 1) {
            return $this->saveSelectedFacebookPage($account, $pages[0]);
        }

        $metadata = array_merge($account->metadata ?: [], [
            'oauth_mode' => 'connect',
            'publish_enabled' => false,
            'available_pages_count' => count($pages),
            'available_pages' => $pages,
            'sm1a_placeholder' => false,
        ]);

        if ($pages === []) {
            $account->update([
                'status' => 'connected_no_pages',
                'account_name' => 'Facebook Page',
                'account_id' => null,
                'account_handle' => null,
                'last_error' => 'Meta connected, but no Facebook Pages were returned. Make sure your Facebook account has admin access to the Society Flats Page.',
                'metadata' => $metadata,
            ]);

            return $account->fresh();
        }

        $account->update([
            'status' => 'pending_page_selection',
            'account_name' => 'Choose Facebook Page',
            'account_id' => null,
            'account_handle' => null,
            'last_error' => null,
            'metadata' => $metadata,
        ]);

        return $account->fresh();
    }

    private function saveSelectedFacebookPage(SocialAccount $account, array $page, string $source = 'me_accounts'): SocialAccount
    {
        $metadata = array_merge($account->metadata ?: [], [
            'oauth_mode' => 'connect',
            'publish_enabled' => false,
            'available_pages_count' => (int) data_get($account->metadata, 'available_pages_count', 1),
            'selected_page_id' => (string) data_get($page, 'id'),
            'sm1a_placeholder' => false,
            'source' => $source,
        ]);

        $account->update([
            'status' => 'connected',
            'account_name' => (string) data_get($page, 'name', 'Facebook Page'),
            'account_id' => (string) data_get($page, 'id'),
            'account_handle' => data_get($page, 'username'),
            'last_error' => null,
            'metadata' => $metadata,
        ]);

        $this->syncInstagramBusinessAccount($page, $account);

        return $account->fresh();
    }

    private function saveManualFacebookPage(
        SocialAccount $account,
        string $pageId,
        string $pageName,
        ?string $instagramId = null,
        ?string $instagramHandle = null,
    ): SocialAccount
    {
        $pageId = trim($pageId);
        $pageName = trim($pageName);
        $instagramId = trim((string) $instagramId);
        $instagramHandle = $this->normalizeInstagramHandle((string) $instagramHandle);

        if ($pageId === '' || $pageName === '') {
            throw new InvalidArgumentException('Manual Facebook Page ID fallback requires both Page ID and Page name.');
        }

        if (($instagramId !== '' && $instagramHandle === '') || ($instagramId === '' && $instagramHandle !== '')) {
            throw new InvalidArgumentException('Manual Instagram asset save requires both Instagram ID and Instagram handle.');
        }

        $metadata = array_merge($account->metadata ?: [], [
            'oauth_mode' => 'connect',
            'publish_enabled' => false,
            'selected_page_id' => $pageId,
            'source' => 'manual_page_id',
            'sm1a_placeholder' => false,
            'manual_page_warning' => true,
        ]);

        $account->update([
            'status' => 'connected_manual_page',
            'account_name' => $pageName,
            'account_id' => $pageId,
            'account_handle' => null,
            'last_error' => null,
            'metadata' => $metadata,
        ]);

        if ($instagramId !== '' && $instagramHandle !== '') {
            $this->saveManualInstagramBusinessAccount($account->fresh(), $instagramId, $instagramHandle);
        } else {
            $instagram = SocialAccount::where('platform', 'instagram_business')->first();
            if (! $instagram || $instagram->status !== 'connected') {
                SocialAccount::updateOrCreate(
                    ['platform' => 'instagram_business'],
                    [
                        'account_name' => self::PLATFORMS['instagram_business'],
                        'account_id' => null,
                        'account_handle' => null,
                        'status' => 'connected_missing_ig',
                        'last_error' => null,
                        'metadata' => [
                            'message' => 'Instagram Business account could not be verified through Meta yet.',
                            'publish_enabled' => false,
                            'sm2_manual_only' => true,
                            'sm1a_placeholder' => false,
                        ],
                    ],
                );
            }
        }

        return $account->fresh();
    }

    private function saveManualInstagramBusinessAccount(SocialAccount $facebookAccount, string $instagramId, string $instagramHandle): void
    {
        $instagram = SocialAccount::firstOrNew(['platform' => 'instagram_business']);
        $instagram->fill([
            'account_name' => $instagramHandle ?: 'societyflats',
            'account_id' => $instagramId,
            'account_handle' => $instagramHandle,
            'status' => 'connected_manual_page',
            'token_expires_at' => $facebookAccount->token_expires_at,
            'last_connected_at' => now(),
            'last_error' => null,
            'scopes' => $facebookAccount->scopes ?: [],
            'metadata' => array_merge($instagram->metadata ?: [], [
                'sm1a_placeholder' => false,
                'oauth_mode' => 'connect',
                'sm2_manual_only' => true,
                'connected_via' => 'oauth',
                'connected_facebook_page_id' => $facebookAccount->account_id,
                'source' => 'manual_instagram_id',
                'publish_enabled' => false,
                'manual_instagram_warning' => true,
            ]),
        ]);
        $instagram->access_token = $facebookAccount->accessToken();
        $instagram->save();
    }

    private function saveManualInstagramIfProvided(
        bool $manualFallbackConfirmed,
        SocialAccount $facebookAccount,
        ?string $instagramId,
        ?string $instagramHandle,
    ): void {
        if (! $manualFallbackConfirmed) {
            return;
        }

        $instagramId = trim((string) $instagramId);
        $instagramHandle = $this->normalizeInstagramHandle((string) $instagramHandle);

        if ($instagramId === '' && $instagramHandle === '') {
            return;
        }

        if ($instagramId === '' || $instagramHandle === '') {
            throw new InvalidArgumentException('Manual Instagram asset save requires both Instagram ID and Instagram handle.');
        }

        $this->saveManualInstagramBusinessAccount($facebookAccount, $instagramId, $instagramHandle);
    }

    private function syncInstagramBusinessAccount(array $page, SocialAccount $facebookAccount): void
    {
        $ig = data_get($page, 'instagram_business_account');
        if (! is_array($ig) || ! data_get($ig, 'id')) {
            SocialAccount::updateOrCreate(
                ['platform' => 'instagram_business'],
                [
                    'account_name' => self::PLATFORMS['instagram_business'],
                    'status' => 'not_connected',
                    'last_error' => null,
                    'metadata' => [
                        'message' => 'No Instagram Business account is connected to this Facebook Page.',
                        'publish_enabled' => false,
                        'sm2_manual_only' => true,
                    ],
                ],
            );

            return;
        }

        $instagram = SocialAccount::firstOrNew(['platform' => 'instagram_business']);
        $instagram->fill([
            'account_name' => (string) (data_get($ig, 'name') ?: data_get($ig, 'username') ?: 'Instagram Business'),
            'account_id' => (string) data_get($ig, 'id'),
            'account_handle' => data_get($ig, 'username'),
            'status' => 'connected',
            'last_connected_at' => now(),
            'last_error' => null,
            'scopes' => $facebookAccount->scopes ?: [],
            'token_expires_at' => $facebookAccount->token_expires_at,
            'metadata' => array_merge($instagram->metadata ?: [], [
                'oauth_mode' => 'connect',
                'publish_enabled' => false,
                'facebook_page_id' => $facebookAccount->account_id,
                'connected_facebook_page_id' => $facebookAccount->account_id,
                'instagram_business_account_id' => (string) data_get($ig, 'id'),
                'sm1a_placeholder' => false,
            ]),
        ]);
        $instagram->access_token = $facebookAccount->accessToken();
        $instagram->save();
    }

    private function markMetaPageFetchFailed(SocialAccount $account, string $message): SocialAccount
    {
        $account->update([
            'status' => 'failed',
            'last_error' => $message,
            'metadata' => array_merge($account->metadata ?: [], [
                'oauth_mode' => 'connect',
                'publish_enabled' => false,
                'available_pages_count' => 0,
                'sm1a_placeholder' => false,
            ]),
        ]);

        return $account->fresh();
    }

    private function safeMetaPages(array $pages): array
    {
        return collect($pages)
            ->filter(fn ($page) => is_array($page) && data_get($page, 'id') && data_get($page, 'name'))
            ->map(function (array $page) {
                $ig = data_get($page, 'instagram_business_account');

                return array_filter([
                    'id' => (string) data_get($page, 'id'),
                    'name' => (string) data_get($page, 'name'),
                    'username' => data_get($page, 'username'),
                    'instagram_business_account' => is_array($ig) && data_get($ig, 'id') ? array_filter([
                        'id' => (string) data_get($ig, 'id'),
                        'username' => data_get($ig, 'username'),
                        'name' => data_get($ig, 'name'),
                    ], fn ($value) => $value !== null && $value !== '') : null,
                ], fn ($value) => $value !== null && $value !== '');
            })
            ->values()
            ->all();
    }

    private function facebookAccountWithToken(): SocialAccount
    {
        $account = SocialAccount::where('platform', 'facebook_page')->first();

        if (! $account || ! $account->accessToken()) {
            throw new InvalidArgumentException('No encrypted Meta OAuth token is stored for the Facebook Page connection.');
        }

        return $account;
    }

    private function findStoredAvailableMetaPage(SocialAccount $account, string $pageId): ?array
    {
        $pages = data_get($account->metadata, 'available_pages', []);

        $page = collect(is_array($pages) ? $pages : [])
            ->first(fn ($candidate) => (string) data_get($candidate, 'id') === (string) $pageId);

        return is_array($page) ? $page : null;
    }

    private function metaPageInventory(SocialAccount $account): array
    {
        $token = $account->accessToken();
        $lastError = null;
        $me = null;
        $pagesFromMe = [];
        $businesses = [];

        $meResponse = $this->metaGet('me', [
            'fields' => 'id,name',
            'access_token' => $token,
        ]);
        if ($meResponse->successful()) {
            $me = $this->safeMetaMe($meResponse->json());
        } else {
            $lastError = $this->metaErrorMessage($meResponse, 'Meta Graph API did not return profile details.');
        }

        $accountsResponse = $this->metaGet('me/accounts', [
            'fields' => 'id,name,username,tasks,instagram_business_account{id,username,name}',
            'access_token' => $token,
        ]);
        if ($accountsResponse->successful()) {
            $pagesFromMe = $this->safeMetaDebugPages($accountsResponse->json('data', []), 'me_accounts');
        } else {
            $lastError = $this->metaErrorMessage($accountsResponse, 'Meta Graph API did not return Facebook Pages.');
        }

        $businessesResponse = $this->metaGet('me/businesses', [
            'fields' => 'id,name',
            'access_token' => $token,
        ]);

        if ($businessesResponse->successful()) {
            foreach ((array) $businessesResponse->json('data', []) as $business) {
                if (! is_array($business) || ! data_get($business, 'id')) {
                    continue;
                }

                $businessId = (string) data_get($business, 'id');
                $ownedPages = $this->businessPages($businessId, 'owned_pages', $token);
                $clientPages = $this->businessPages($businessId, 'client_pages', $token);

                $businesses[] = [
                    'id' => $businessId,
                    'name' => (string) data_get($business, 'name', 'Meta Business'),
                    'owned_pages_count' => count($ownedPages),
                    'client_pages_count' => count($clientPages),
                    'owned_pages' => $ownedPages,
                    'client_pages' => $clientPages,
                ];
            }
        } else {
            $lastError = $this->metaErrorMessage($businessesResponse, 'Meta Graph API did not return Business Portfolio assets.');
        }

        return [
            'me' => $me,
            'pages_from_me_accounts' => $pagesFromMe,
            'businesses' => $businesses,
            'last_error' => $lastError,
        ];
    }

    private function businessPages(string $businessId, string $edge, ?string $token): array
    {
        $response = $this->metaGet("{$businessId}/{$edge}", [
            'fields' => 'id,name,username,tasks,instagram_business_account{id,username,name}',
            'access_token' => $token,
        ]);

        if (! $response->successful()) {
            return [];
        }

        return $this->safeMetaDebugPages($response->json('data', []), $edge);
    }

    private function metaGet(string $path, array $query)
    {
        return Http::get("https://graph.facebook.com/v20.0/{$path}", $query);
    }

    private function metaErrorMessage($response, string $fallback): string
    {
        return (string) ($response->json('error.message') ?: $fallback);
    }

    private function safeMetaMe(array $me): ?array
    {
        if (! data_get($me, 'id')) {
            return null;
        }

        return [
            'id' => (string) data_get($me, 'id'),
            'name' => data_get($me, 'name'),
        ];
    }

    private function safeMetaInventoryForDebug(array $inventory): array
    {
        $businesses = collect((array) data_get($inventory, 'businesses', []))
            ->map(fn ($business) => [
                'id' => (string) data_get($business, 'id'),
                'name' => (string) data_get($business, 'name'),
                'owned_pages_count' => (int) data_get($business, 'owned_pages_count', 0),
                'client_pages_count' => (int) data_get($business, 'client_pages_count', 0),
                'owned_pages' => $this->stripInternalMetaPageFields((array) data_get($business, 'owned_pages', [])),
                'client_pages' => $this->stripInternalMetaPageFields((array) data_get($business, 'client_pages', [])),
            ])
            ->values()
            ->all();

        return [
            'me' => data_get($inventory, 'me'),
            'pages_count_from_me_accounts' => count((array) data_get($inventory, 'pages_from_me_accounts', [])),
            'businesses_count' => count($businesses),
            'businesses' => $businesses,
            'last_error' => data_get($inventory, 'last_error'),
        ];
    }

    private function stripInternalMetaPageFields(array $pages): array
    {
        return collect($pages)
            ->map(fn ($page) => [
                'id' => (string) data_get($page, 'id'),
                'name' => (string) data_get($page, 'name'),
                'username' => data_get($page, 'username'),
                'tasks' => data_get($page, 'tasks', []),
                'has_instagram_business_account' => (bool) data_get($page, 'has_instagram_business_account', false),
                'instagram_username' => data_get($page, 'instagram_username'),
            ])
            ->values()
            ->all();
    }

    private function findSocietyFlatsPage(array $inventory): ?array
    {
        return collect($this->flattenMetaPages($inventory))
            ->first(fn ($page) => $this->normalizePageName((string) data_get($page, 'name')) === 'society flats');
    }

    private function findMetaPage(array $inventory, string $pageId): ?array
    {
        return collect($this->flattenMetaPages($inventory))
            ->first(fn ($page) => (string) data_get($page, 'id') === (string) $pageId);
    }

    private function flattenMetaPages(array $inventory): array
    {
        $pages = collect((array) data_get($inventory, 'pages_from_me_accounts', []));

        foreach ((array) data_get($inventory, 'businesses', []) as $business) {
            $pages = $pages
                ->merge((array) data_get($business, 'owned_pages', []))
                ->merge((array) data_get($business, 'client_pages', []));
        }

        return $pages
            ->unique(fn ($page) => (string) data_get($page, 'id'))
            ->values()
            ->all();
    }

    private function pageForSave(array $page): array
    {
        return array_filter([
            'id' => (string) data_get($page, 'id'),
            'name' => (string) data_get($page, 'name'),
            'username' => data_get($page, 'username'),
            'instagram_business_account' => data_get($page, 'instagram_business_account'),
        ], fn ($value) => $value !== null && $value !== '');
    }

    private function normalizePageName(string $name): string
    {
        return trim(preg_replace('/\s+/', ' ', mb_strtolower($name)) ?: '');
    }

    private function normalizeInstagramHandle(string $handle): string
    {
        return trim(ltrim($handle, '@'));
    }

    private function safeMetaDebugPages(array $pages, string $source = 'me_accounts'): array
    {
        return collect($pages)
            ->filter(fn ($page) => is_array($page) && data_get($page, 'id') && data_get($page, 'name'))
            ->map(function (array $page) use ($source) {
                $ig = data_get($page, 'instagram_business_account');

                return [
                    'id' => (string) data_get($page, 'id'),
                    'name' => (string) data_get($page, 'name'),
                    'username' => data_get($page, 'username'),
                    'tasks' => array_values(array_filter(array_map('strval', (array) data_get($page, 'tasks', [])))),
                    'has_instagram_business_account' => is_array($ig) && (bool) data_get($ig, 'id'),
                    'instagram_username' => is_array($ig) ? data_get($ig, 'username') : null,
                    'instagram_business_account' => is_array($ig) && data_get($ig, 'id') ? array_filter([
                        'id' => (string) data_get($ig, 'id'),
                        'username' => data_get($ig, 'username'),
                        'name' => data_get($ig, 'name'),
                    ], fn ($value) => $value !== null && $value !== '') : null,
                    'source' => $source,
                ];
            })
            ->values()
            ->all();
    }
}
