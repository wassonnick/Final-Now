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
            'instagram_business', 'facebook_page' => $this->metaScopes($mode),
            'linkedin' => ['openid', 'profile', 'w_member_social'],
            'google_business_profile' => ['https://www.googleapis.com/auth/business.manage'],
            default => [],
        };
    }

    private function metaScopes(string $mode): array
    {
        $key = $mode === 'publish' ? 'meta_publish_scopes' : 'meta_connect_scopes';
        $fallback = $mode === 'publish'
            ? 'pages_manage_posts,pages_manage_engagement,instagram_basic,instagram_content_publish'
            : 'public_profile,pages_show_list,pages_read_engagement';

        $raw = (string) config("services.social_oauth.{$key}", $fallback);

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

    private function saveSelectedFacebookPage(SocialAccount $account, array $page): SocialAccount
    {
        $metadata = array_merge($account->metadata ?: [], [
            'oauth_mode' => 'connect',
            'publish_enabled' => false,
            'available_pages_count' => (int) data_get($account->metadata, 'available_pages_count', 1),
            'selected_page_id' => (string) data_get($page, 'id'),
            'sm1a_placeholder' => false,
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
}
