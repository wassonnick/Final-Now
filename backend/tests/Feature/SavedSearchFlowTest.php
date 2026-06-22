<?php

namespace Tests\Feature;

use App\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SavedSearchFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_account_can_manage_only_its_saved_searches(): void
    {
        $token = str_repeat('s', 80);
        $account = Account::create([
            'role' => 'customer', 'phone' => '9999999997', 'phone_normalized' => '9999999997',
            'status' => 'active', 'api_token_hash' => hash('sha256', $token),
        ]);

        $this->postJson('/api/accounts/saved-searches', [])->assertUnauthorized();

        $saved = $this->withToken($token)->postJson('/api/accounts/saved-searches', [
            'name' => 'Golf Course Road rentals',
            'filters' => ['q' => 'Golf Course Road', 'tab' => 'properties', 'listing_type' => 'Rent'],
            'alert_enabled' => true,
            'alert_channel' => 'whatsapp',
            'alert_frequency' => 'daily',
        ])->assertCreated()->assertJsonPath('data.account_id', $account->id)->json('data');

        $this->withToken($token)->getJson('/api/accounts/saved-searches')
            ->assertOk()->assertJsonCount(1, 'data');

        $this->withToken($token)->putJson('/api/accounts/saved-searches/'.$saved['id'], [
            'alert_enabled' => false,
        ])->assertOk()->assertJsonPath('data.alert_enabled', false);

        $this->withToken($token)->deleteJson('/api/accounts/saved-searches/'.$saved['id'])
            ->assertOk();

        $this->assertDatabaseCount('saved_searches', 0);
    }
}
