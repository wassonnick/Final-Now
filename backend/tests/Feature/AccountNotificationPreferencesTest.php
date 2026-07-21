<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AccountDevice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountNotificationPreferencesTest extends TestCase
{
    use RefreshDatabase;

    public function test_notification_preferences_require_account_token(): void
    {
        $this->getJson('/api/accounts/notification-preferences')
            ->assertUnauthorized();

        $this->postJson('/api/accounts/device-tokens', [])
            ->assertUnauthorized();
    }

    public function test_account_can_register_mobile_push_token_without_token_exposure(): void
    {
        [$account, $token] = $this->accountWithToken();

        $this->withToken($token)->postJson('/api/accounts/device-tokens', [
            'device_id' => 'ios-install-123',
            'platform' => 'ios',
            'expo_push_token' => 'ExpoPushToken[abc_123-XYZ]',
            'preferences' => [
                'saved_search_alerts' => true,
                'site_visit_reminders' => false,
                'owner_listing_updates' => true,
            ],
        ])
            ->assertOk()
            ->assertJsonPath('data.device_id', 'ios-install-123')
            ->assertJsonPath('data.push_token_registered', true)
            ->assertJsonMissing(['expo_push_token' => 'ExpoPushToken[abc_123-XYZ]']);

        $this->assertDatabaseHas('account_devices', [
            'account_id' => $account->id,
            'device_id' => 'ios-install-123',
            'platform' => 'ios',
            'site_visit_reminders' => false,
        ]);
    }

    public function test_account_can_update_preferences_for_registered_devices(): void
    {
        [$account, $token] = $this->accountWithToken();

        AccountDevice::create([
            'account_id' => $account->id,
            'device_id' => 'android-install-1',
            'platform' => 'android',
            'expo_push_token' => 'ExpoPushToken[existing]',
            'last_registered_at' => now(),
        ]);

        $this->withToken($token)->patchJson('/api/accounts/notification-preferences', [
            'saved_search_alerts' => false,
            'owner_listing_updates' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.saved_search_alerts', false)
            ->assertJsonPath('data.owner_listing_updates', false)
            ->assertJsonPath('data.registered_devices_count', 1);
    }

    public function test_account_can_disable_a_registered_device(): void
    {
        [$account, $token] = $this->accountWithToken();

        AccountDevice::create([
            'account_id' => $account->id,
            'device_id' => 'ios-install-456',
            'platform' => 'ios',
            'expo_push_token' => 'ExpoPushToken[to-disable]',
            'last_registered_at' => now(),
        ]);

        $this->withToken($token)->deleteJson('/api/accounts/device-tokens/ios-install-456')
            ->assertOk();

        $this->withToken($token)->getJson('/api/accounts/notification-preferences')
            ->assertOk()
            ->assertJsonPath('data.registered_devices_count', 0)
            ->assertJsonPath('data.push_ready', false);

        $this->assertNotNull(AccountDevice::where('device_id', 'ios-install-456')->first()?->disabled_at);
    }

    private function accountWithToken(): array
    {
        $token = str_repeat('n', 80);
        $account = Account::create([
            'role' => 'customer',
            'phone' => '9999999996',
            'phone_normalized' => '9999999996',
            'status' => 'active',
            'api_token_hash' => hash('sha256', $token),
        ]);

        return [$account, $token];
    }
}
