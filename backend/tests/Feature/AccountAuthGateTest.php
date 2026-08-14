<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Support\AccountRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Five controllers each parsed the bearer themselves and the copies had drifted: three
 * checked the account was active and three did not, so a suspension blocked saved searches
 * while leaving the dashboard, listings, notifications and claims fully usable.
 */
class AccountAuthGateTest extends TestCase
{
    use RefreshDatabase;

    /** @return array{0:Account,1:string} */
    private function account(string $status = 'active'): array
    {
        $token = Str::random(80);

        $account = Account::create([
            'role' => AccountRole::CUSTOMER,
            'phone' => '9811100011',
            'phone_normalized' => '9811100011',
            'name' => 'Priya Sharma',
            'status' => $status,
            'api_token_hash' => hash('sha256', $token),
            'api_token_created_at' => now(),
        ]);

        return [$account, $token];
    }

    /** @return array<int,string> */
    private function gatedRoutes(): array
    {
        return [
            '/api/accounts/me',
            '/api/accounts/dashboard',
            '/api/accounts/notifications',
            '/api/accounts/referrals',
            '/api/accounts/saved-searches',
            '/api/accounts/listings',
            '/api/accounts/builder-claims',
            '/api/accounts/notification-preferences',
        ];
    }

    public function test_every_account_route_refuses_an_anonymous_request(): void
    {
        foreach ($this->gatedRoutes() as $route) {
            $this->getJson($route)->assertUnauthorized($route);
        }
    }

    public function test_every_account_route_refuses_a_bogus_token(): void
    {
        foreach ($this->gatedRoutes() as $route) {
            $this->withToken(Str::random(80))->getJson($route)->assertUnauthorized($route);
        }
    }

    /** The drift that mattered: a suspension has to apply everywhere, not to two endpoints. */
    public function test_a_suspended_account_is_refused_everywhere(): void
    {
        [, $token] = $this->account('suspended');

        foreach ($this->gatedRoutes() as $route) {
            $this->withToken($token)->getJson($route)->assertForbidden($route);
        }
    }

    public function test_an_active_account_is_let_through(): void
    {
        [$account, $token] = $this->account();

        $this->withToken($token)->getJson('/api/accounts/me')
            ->assertSuccessful()
            ->assertJsonPath('account.id', $account->id);
    }

    /** The way in cannot require a token, or nobody could ever get one. */
    public function test_signup_and_otp_stay_public(): void
    {
        $this->postJson('/api/accounts/upsert', [
            'role' => AccountRole::CUSTOMER,
            'phone' => '9844400044',
            'name' => 'New Person',
        ])->assertSuccessful();

        $this->postJson('/api/accounts/request-otp', [
            'role' => AccountRole::CUSTOMER,
            'phone' => '9844400044',
        ])->assertStatus(200);
    }

    /** Public routes still accept an optional token for attribution. */
    public function test_a_public_route_still_works_without_a_token(): void
    {
        $this->postJson('/api/accounts/upsert', [
            'role' => AccountRole::BROKER,
            'phone' => '9855500055',
        ])->assertSuccessful();
    }

    public function test_signup_rejects_a_role_that_is_not_offered(): void
    {
        $this->postJson('/api/accounts/upsert', [
            'role' => 'builder',
            'phone' => '9866600066',
        ])->assertStatus(422);
    }
}
