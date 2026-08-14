<?php

namespace Tests\Feature;

use App\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Two pre-login endpoints handed back a stranger's profile to anyone who knew their phone
 * number. Indian mobile numbers are ten digits, so "knowing the number" is a low bar.
 */
class AccountPrivacyTest extends TestCase
{
    use RefreshDatabase;

    private function account(array $attributes = []): array
    {
        $token = Str::random(80);

        $account = tap(Account::create(array_merge([
            'role' => 'customer',
            'phone' => '9811100011',
            'phone_normalized' => '9811100011',
            'name' => 'Priya Sharma',
            'email' => 'priya@example.com',
            'status' => 'active',
            'api_token_hash' => hash('sha256', $token),
            'api_token_created_at' => now(),
        ], $attributes)), fn ($account) => $this->sessionFor($account, $token));

        return [$account, $token];
    }

    public function test_me_refuses_a_request_with_no_token(): void
    {
        $this->account();

        $this->getJson('/api/accounts/me?phone=9811100011')->assertUnauthorized();
    }

    public function test_me_ignores_a_phone_in_the_query_and_returns_the_bearer(): void
    {
        [$mine, $token] = $this->account();
        $this->account(['phone' => '9822200022', 'phone_normalized' => '9822200022', 'name' => 'Someone Else', 'email' => 'other@example.com']);

        $this->withToken($token)
            ->getJson('/api/accounts/me?phone=9822200022')
            ->assertSuccessful()
            ->assertJsonPath('account.id', $mine->id)
            ->assertJsonPath('account.name', 'Priya Sharma');
    }

    /** Signup is unauthenticated, so it must not double as a profile lookup. */
    public function test_signup_on_a_taken_number_reveals_nothing_about_its_owner(): void
    {
        $this->account();

        $response = $this->postJson('/api/accounts/upsert', [
            'role' => 'broker',
            'phone' => '9811100011',
            'name' => 'Attacker',
            'email' => 'attacker@example.com',
        ])->assertSuccessful()->assertJsonPath('existing', true);

        $body = $response->getContent();
        $this->assertStringNotContainsString('Priya Sharma', $body);
        $this->assertStringNotContainsString('priya@example.com', $body);
        $this->assertArrayNotHasKey('account', $response->json());
    }

    /** Nor as a way to write yourself into someone else's account. */
    public function test_signup_cannot_fill_a_blank_name_or_email_on_a_taken_number(): void
    {
        [$account] = $this->account(['name' => null, 'email' => null]);

        $this->postJson('/api/accounts/upsert', [
            'role' => 'broker',
            'phone' => '9811100011',
            'name' => 'Attacker',
            'email' => 'attacker@example.com',
        ])->assertSuccessful();

        $account->refresh();
        $this->assertNull($account->name);
        $this->assertNull($account->email);
    }

    /** A genuinely new number still creates an account and gets its profile back. */
    public function test_a_new_signup_still_works(): void
    {
        $this->postJson('/api/accounts/upsert', [
            'role' => 'customer',
            'phone' => '9833300033',
            'name' => 'New Person',
        ])
            ->assertSuccessful()
            ->assertJsonPath('existing', false)
            ->assertJsonPath('account.name', 'New Person');
    }
}
