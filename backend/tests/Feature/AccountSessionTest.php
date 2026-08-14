<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AccountSession;
use App\Support\AccountRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The single token column meant a login on one device silently ended the session on
 * another, there was no logout anywhere, and a token copied off a device worked for ever.
 */
class AccountSessionTest extends TestCase
{
    use RefreshDatabase;

    private function account(): Account
    {
        return Account::create([
            'role' => AccountRole::CUSTOMER,
            'phone' => '9811100011',
            'phone_normalized' => '9811100011',
            'name' => 'Priya Sharma',
            'status' => 'active',
        ]);
    }

    private function signIn(Account $account, ?string $agent = null): string
    {
        [, $token] = AccountSession::issue($account, $agent);

        return $token;
    }

    /** Signing in on a phone must not sign you out on a laptop. */
    public function test_two_devices_can_be_signed_in_at_once(): void
    {
        $account = $this->account();

        $laptop = $this->signIn($account, 'Mozilla/5.0 (Macintosh) Chrome/120');
        $phone = $this->signIn($account, 'Mozilla/5.0 (iPhone) Safari/17');

        $this->withToken($laptop)->getJson('/api/accounts/me')->assertSuccessful();
        $this->withToken($phone)->getJson('/api/accounts/me')->assertSuccessful();
    }

    public function test_signing_out_ends_this_device_and_leaves_the_other(): void
    {
        $account = $this->account();
        $laptop = $this->signIn($account);
        $phone = $this->signIn($account);

        $this->withToken($phone)->postJson('/api/accounts/logout')->assertSuccessful();

        $this->withToken($phone)->getJson('/api/accounts/me')->assertUnauthorized();
        $this->withToken($laptop)->getJson('/api/accounts/me')->assertSuccessful();
    }

    /** The thing to reach for after losing a phone. */
    public function test_signing_out_everywhere_ends_every_device(): void
    {
        $account = $this->account();
        $laptop = $this->signIn($account);
        $phone = $this->signIn($account);

        $this->withToken($laptop)->postJson('/api/accounts/logout-all')->assertSuccessful();

        $this->withToken($laptop)->getJson('/api/accounts/me')->assertUnauthorized();
        $this->withToken($phone)->getJson('/api/accounts/me')->assertUnauthorized();
    }

    public function test_a_device_can_be_named_and_ended_from_the_list(): void
    {
        $account = $this->account();
        $laptop = $this->signIn($account, 'Mozilla/5.0 (Macintosh) Chrome/120');
        $phone = $this->signIn($account, 'Mozilla/5.0 (iPhone) Safari/17');

        $sessions = $this->withToken($laptop)->getJson('/api/accounts/sessions')
            ->assertSuccessful()
            ->json('sessions');

        $this->assertCount(2, $sessions);
        $this->assertContains('Mac · Chrome', array_column($sessions, 'device'));
        $this->assertContains('iOS · Safari', array_column($sessions, 'device'));
        $this->assertSame(1, count(array_filter($sessions, fn ($s) => $s['is_current'])));

        $other = collect($sessions)->firstWhere('is_current', false);
        $this->withToken($laptop)->deleteJson("/api/accounts/sessions/{$other['id']}")->assertSuccessful();

        $this->withToken($phone)->getJson('/api/accounts/me')->assertUnauthorized();
        $this->withToken($laptop)->getJson('/api/accounts/me')->assertSuccessful();
    }

    /** A session id is a small integer; guessing one must not sign anybody else out. */
    public function test_you_cannot_end_someone_elses_session(): void
    {
        $mine = $this->account();
        $theirs = Account::create([
            'role' => AccountRole::CUSTOMER, 'phone' => '9822200022',
            'phone_normalized' => '9822200022', 'status' => 'active',
        ]);

        $myToken = $this->signIn($mine);
        $theirToken = $this->signIn($theirs);
        $theirSession = AccountSession::where('account_id', $theirs->id)->firstOrFail();

        $this->withToken($myToken)->deleteJson("/api/accounts/sessions/{$theirSession->id}")->assertForbidden();
        $this->withToken($theirToken)->getJson('/api/accounts/me')->assertSuccessful();
    }

    /** A token lifted off a device used to work for ever. */
    public function test_an_expired_session_stops_working(): void
    {
        $account = $this->account();
        $token = $this->signIn($account);

        AccountSession::where('account_id', $account->id)->update(['expires_at' => now()->subMinute()]);

        $this->withToken($token)->getJson('/api/accounts/me')->assertUnauthorized();
    }

    /** A session nobody has touched in a month retires itself. */
    public function test_an_idle_session_stops_working(): void
    {
        config(['services.accounts.idle_days' => 30]);
        $account = $this->account();
        $token = $this->signIn($account);

        AccountSession::where('account_id', $account->id)->update(['last_used_at' => now()->subDays(31)]);

        $this->withToken($token)->getJson('/api/accounts/me')->assertUnauthorized();
    }

    /** Use is recorded, but not on every request — that would be a write per call. */
    public function test_usage_is_recorded_without_writing_on_every_request(): void
    {
        $account = $this->account();
        $token = $this->signIn($account);

        AccountSession::where('account_id', $account->id)->update(['last_used_at' => now()->subHour()]);

        $this->withToken($token)->getJson('/api/accounts/me')->assertSuccessful();
        $touched = AccountSession::where('account_id', $account->id)->firstOrFail()->last_used_at;
        $this->assertTrue($touched->gt(now()->subMinute()), 'A stale session records the visit.');

        $this->withToken($token)->getJson('/api/accounts/me')->assertSuccessful();
        $this->assertEquals($touched, AccountSession::where('account_id', $account->id)->firstOrFail()->last_used_at, 'A fresh one is left alone.');
    }
}
