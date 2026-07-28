<?php

namespace Tests\Feature;

use App\Models\Account;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class EmailOtpAuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.otp.enabled' => true,
            'services.otp.provider' => 'resend',
            'services.resend.key' => 'test-resend-key',
            'services.resend.endpoint' => 'https://api.resend.test/emails',
            'mail.from.address' => 'hello@societyflats.com',
            'mail.from.name' => 'SocietyFlats',
        ]);
    }

    public function test_email_otp_is_delivered_and_verifies_email_without_marking_phone_verified(): void
    {
        Http::fake([
            'https://api.resend.test/emails' => Http::response(['id' => 'email_test_123'], 200),
        ]);

        $requestResponse = $this->postJson('/api/accounts/request-otp', [
            'role' => 'customer',
            'phone' => '9911886222',
            'name' => 'Test Customer',
            'email' => 'customer@example.com',
            'channel' => 'email',
        ]);

        $requestResponse
            ->assertOk()
            ->assertJsonPath('delivery.delivered', true)
            ->assertJsonPath('delivery.provider', 'resend')
            ->assertJsonPath('delivery.channel', 'email')
            ->assertJsonMissingPath('access_token')
            ->assertJsonMissingPath('account')
            ->assertJsonMissingPath('resend_api_key');

        $otp = (string) $requestResponse->json('dev_otp');
        $this->assertMatchesRegularExpression('/^\d{6}$/', $otp);

        Http::assertSent(function (Request $request) use ($otp) {
            $payload = $request->data();
            $serialized = json_encode($payload);

            return $request->url() === 'https://api.resend.test/emails'
                && $request->hasHeader('Authorization', 'Bearer test-resend-key')
                && ($payload['to'][0] ?? null) === 'customer@example.com'
                && str_contains((string) $serialized, $otp)
                && ! str_contains((string) $serialized, '9911886222');
        });

        $verifyResponse = $this->postJson('/api/accounts/verify-otp', [
            'role' => 'customer',
            'phone' => '9911886222',
            'otp' => $otp,
        ]);

        $verifyResponse
            ->assertOk()
            ->assertJsonPath('message', 'OTP verified.')
            ->assertJsonStructure(['account_access_token'])
            ->assertJsonMissingPath('resend_api_key');

        $account = Account::where('phone_normalized', '9911886222')->firstOrFail();

        $this->assertNotNull($account->email_verified_at);
        $this->assertNull($account->phone_verified_at);
    }

    public function test_email_otp_cannot_replace_an_existing_accounts_linked_email(): void
    {
        Http::fake();

        $account = Account::create([
            'role' => 'customer',
            'phone' => '9911886222',
            'phone_normalized' => '9911886222',
            'email' => 'linked@example.com',
            'status' => 'active',
        ]);

        $this->postJson('/api/accounts/request-otp', [
            'role' => 'customer',
            'phone' => '9911886222',
            'email' => 'attacker@example.com',
            'channel' => 'email',
        ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'The email does not match the address linked to this account.')
            ->assertJsonMissingPath('account');

        $this->assertSame('linked@example.com', $account->fresh()->email);
        Http::assertNothingSent();
    }

    public function test_email_is_required_for_email_otp_channel(): void
    {
        Http::fake();

        $this->postJson('/api/accounts/request-otp', [
            'role' => 'customer',
            'phone' => '9911886222',
            'channel' => 'email',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('email');

        Http::assertNothingSent();
    }
}
