<?php

namespace App\Services\Social;

use App\Models\SocialAccount;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use InvalidArgumentException;

class SocialOAuthService
{
    private const META_CONNECT_SCOPES = ['public_profile', 'email', 'pages_show_list', 'pages_read_engagement'];
    private const META_INSTAGRAM_PUBLISH_SCOPES = ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement'];
    private const META_FACEBOOK_PUBLISH_SCOPES = ['pages_manage_posts', 'pages_manage_engagement', 'pages_show_list', 'pages_read_engagement'];

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

        return $account;
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
            'instagram_business' => $mode === 'publish' ? self::META_INSTAGRAM_PUBLISH_SCOPES : self::META_CONNECT_SCOPES,
            'facebook_page' => $mode === 'publish' ? self::META_FACEBOOK_PUBLISH_SCOPES : self::META_CONNECT_SCOPES,
            'linkedin' => ['openid', 'profile', 'w_member_social'],
            'google_business_profile' => ['https://www.googleapis.com/auth/business.manage'],
            default => [],
        };
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
}
