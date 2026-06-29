<?php

namespace Tests\Feature;

use App\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ReferralFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
    }

    public function test_referrals_require_a_verified_account_token(): void
    {
        $this->getJson('/api/accounts/referrals')->assertUnauthorized();
        $this->postJson('/api/accounts/referrals', [])->assertUnauthorized();
    }

    public function test_account_can_submit_one_private_referral_and_view_safe_status(): void
    {
        [$account, $token] = $this->accountWithToken();

        $this->withToken($token)->getJson('/api/accounts/referrals')
            ->assertOk()
            ->assertJsonPath('summary.submitted', 0)
            ->assertJsonStructure(['referral_code', 'policy']);

        $this->withToken($token)->postJson('/api/accounts/referrals', [
            'name' => 'Referral Friend',
            'phone' => '9876501234',
            'intent' => 'rent',
            'notes' => 'Looking near Golf Course Road',
        ])->assertCreated()
            ->assertJsonPath('data.phone_last4', '1234')
            ->assertJsonMissingPath('data.referred_phone')
            ->assertJsonPath('data.reward_status', 'pending');

        $this->assertDatabaseHas('referrals', [
            'referrer_account_id' => $account->id,
            'referred_phone' => '9876501234',
            'status' => 'submitted',
        ]);

        $this->withToken($token)->postJson('/api/accounts/referrals', [
            'name' => 'Referral Friend', 'phone' => '9876501234', 'intent' => 'rent',
        ])->assertStatus(422);
    }

    public function test_self_referrals_and_existing_accounts_are_rejected(): void
    {
        [, $token] = $this->accountWithToken();
        Account::create(['role' => 'customer', 'phone' => '9876509999', 'phone_normalized' => '9876509999', 'status' => 'active']);

        $this->withToken($token)->postJson('/api/accounts/referrals', [
            'name' => 'Self', 'phone' => '9876543210', 'intent' => 'buy',
        ])->assertStatus(422);

        $this->withToken($token)->postJson('/api/accounts/referrals', [
            'name' => 'Existing', 'phone' => '9876509999', 'intent' => 'buy',
        ])->assertStatus(422);
    }

    public function test_admin_controls_conversion_and_reward_state(): void
    {
        [$account, $token] = $this->accountWithToken();
        $referralId = $this->withToken($token)->postJson('/api/accounts/referrals', [
            'name' => 'Buyer Friend', 'phone' => '9876502222', 'intent' => 'buy',
        ])->assertCreated()->json('data.id');

        $this->withToken('admin-test-token')->patchJson('/api/admin/referrals/'.$referralId, [
            'reward_status' => 'approved',
        ])->assertStatus(422);

        $this->withToken('admin-test-token')->patchJson('/api/admin/referrals/'.$referralId, [
            'status' => 'converted',
            'reward_status' => 'approved',
            'admin_notes' => 'Conversion verified manually.',
        ])->assertOk()
            ->assertJsonPath('data.status', 'converted')
            ->assertJsonPath('data.reward_status', 'approved');

        $this->assertDatabaseHas('referrals', ['id' => $referralId, 'referrer_account_id' => $account->id, 'status' => 'converted']);
    }

    private function accountWithToken(): array
    {
        $token = str_repeat('r', 80);
        $account = Account::create([
            'role' => 'customer',
            'phone' => '9876543210',
            'phone_normalized' => '9876543210',
            'status' => 'active',
            'phone_verified_at' => now(),
            'api_token_hash' => hash('sha256', $token),
            'api_token_created_at' => now(),
        ]);

        return [$account, $token];
    }
}
