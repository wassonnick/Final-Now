<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AccountOtp;
use App\Models\AccountSession;
use App\Support\AccountRole;
use App\Support\AccountStatus;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AdminAccountManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
    }

    private function account(string $role = AccountRole::CUSTOMER, string $status = AccountStatus::ACTIVE): Account
    {
        return Account::create([
            'role' => $role,
            'phone' => '9811100011',
            'phone_normalized' => '9811100011',
            'name' => 'Priya Sharma',
            'status' => $status,
        ]);
    }

    private function admin()
    {
        return $this->withToken('admin-test-token')->withHeader('X-Admin-Email', 'ops@societyflats.com');
    }

    /** RWA was missing from the admin's role list entirely. */
    public function test_an_admin_can_set_the_rwa_role(): void
    {
        $account = $this->account();

        $this->admin()->patchJson("/api/admin/accounts/{$account->id}", ['role' => AccountRole::RWA])
            ->assertSuccessful();

        $this->assertSame(AccountRole::RWA, $account->fresh()->role);
    }

    /** And editing an existing RWA member failed validation on their own role. */
    public function test_editing_an_rwa_member_does_not_fail_on_their_own_role(): void
    {
        $account = $this->account(AccountRole::RWA);

        $this->admin()->patchJson("/api/admin/accounts/{$account->id}", [
            'role' => AccountRole::RWA,
            'name' => 'Renamed Secretary',
        ])->assertSuccessful();

        $this->assertSame('Renamed Secretary', $account->fresh()->name);
    }

    /** Blocking has to end the sessions, not just refuse future ones. */
    public function test_blocking_an_account_signs_its_devices_out(): void
    {
        $account = $this->account();
        [, $token] = AccountSession::issue($account, 'Mozilla/5.0 (iPhone) Safari/17');

        $this->withToken($token)->getJson('/api/accounts/me')->assertSuccessful();

        $this->admin()->patchJson("/api/admin/accounts/{$account->id}", ['status' => AccountStatus::BLOCKED])
            ->assertSuccessful();

        // 401, not 403: the session itself is gone, so there is nothing left to identify.
        $this->withToken($token)->getJson('/api/accounts/me')->assertUnauthorized();
        $this->assertSame(0, $account->fresh()->sessions()->active()->count());
    }

    /** Unblocking must not silently restore a device the person may no longer hold. */
    public function test_unblocking_does_not_bring_the_old_devices_back(): void
    {
        $account = $this->account();
        [, $token] = AccountSession::issue($account);

        $this->admin()->patchJson("/api/admin/accounts/{$account->id}", ['status' => AccountStatus::BLOCKED]);
        $this->admin()->patchJson("/api/admin/accounts/{$account->id}", ['status' => AccountStatus::ACTIVE]);

        $this->withToken($token)->getJson('/api/accounts/me')->assertUnauthorized();
    }

    /** The answer when a device is lost but the account is fine. */
    public function test_an_admin_can_sign_every_device_out_without_blocking(): void
    {
        $account = $this->account();
        [, $laptop] = AccountSession::issue($account);
        [, $phone] = AccountSession::issue($account);

        $this->admin()->postJson("/api/admin/accounts/{$account->id}/sign-out-everywhere")
            ->assertSuccessful()
            ->assertJsonPath('account.active_sessions', 0);

        $this->withToken($laptop)->getJson('/api/accounts/me')->assertUnauthorized();
        $this->withToken($phone)->getJson('/api/accounts/me')->assertUnauthorized();
        $this->assertSame(AccountStatus::ACTIVE, $account->fresh()->status, 'The account itself is untouched.');
    }

    /** Who did it, on the record. */
    public function test_the_admin_who_blocked_an_account_is_recorded(): void
    {
        $account = $this->account();
        AccountSession::issue($account);

        $this->admin()->patchJson("/api/admin/accounts/{$account->id}", ['status' => AccountStatus::BLOCKED]);

        $meta = $account->fresh()->meta;
        $this->assertSame('ops@societyflats.com', $meta['blocked_by']);
        $this->assertSame(1, $meta['blocked_sessions_revoked']);
        $this->assertNotEmpty($meta['blocked_at']);
    }

    /** The list has to answer "who is actually signed in". */
    public function test_the_account_list_reports_active_devices(): void
    {
        $account = $this->account();
        AccountSession::issue($account);
        AccountSession::issue($account);

        $row = collect($this->admin()->getJson('/api/admin/accounts')->assertSuccessful()->json('data'))
            ->firstWhere('id', $account->id);

        $this->assertSame(2, $row['active_sessions']);
        $this->assertNotNull($row['last_seen_at']);
    }

    public function test_the_endpoint_is_admin_only(): void
    {
        $account = $this->account();

        $this->postJson("/api/admin/accounts/{$account->id}/sign-out-everywhere")->assertUnauthorized();
    }

    /** Blocking was undone by the blocked person simply logging in again. */
    public function test_a_blocked_account_cannot_log_back_in(): void
    {
        $account = $this->account(AccountRole::CUSTOMER, AccountStatus::BLOCKED);

        AccountOtp::create([
            'account_id' => $account->id,
            'phone_normalized' => $account->phone_normalized,
            'role' => AccountRole::CUSTOMER,
            'channel' => 'sms',
            'code_hash' => Hash::make('123456'),
            'expires_at' => now()->addMinutes(10),
        ]);

        $this->postJson('/api/accounts/verify-otp', [
            'role' => AccountRole::CUSTOMER,
            'phone' => $account->phone_normalized,
            'otp' => '123456',
        ])->assertForbidden();

        $this->assertSame(AccountStatus::BLOCKED, $account->fresh()->status, 'The block survives the login attempt.');
        $this->assertSame(0, $account->fresh()->sessions()->active()->count());
    }
}
