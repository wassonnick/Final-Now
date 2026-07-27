<?php

namespace Tests\Feature;

use App\Models\EmailDelivery;
use App\Models\Lead;
use App\Services\Email\SocietyFlatsEmailService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class EmailDeliveryTrackingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.admin_api_token' => 'admin-test-token',
            'services.resend.key' => 'resend-test-key',
            'services.societyflats_email.admin_email' => 'admin@societyflats.test',
            'services.societyflats_email.lead_alert_email' => 'admin@societyflats.test',
            'services.societyflats_email.reply_to' => 'reply@societyflats.test',
            'mail.from.address' => 'hello@societyflats.test',
            'mail.from.name' => 'SocietyFlats',
        ]);
    }

    public function test_successful_resend_delivery_is_tracked_without_full_recipient_or_message_body(): void
    {
        Http::fake([
            'api.resend.com/*' => Http::response(['id' => 'email_provider_123'], 200),
        ]);

        $lead = Lead::create([
            'name' => 'Delivery Test',
            'phone' => '9876543210',
            'email' => 'buyer@example.com',
            'message' => 'Private callback details',
            'source' => 'website',
            'status' => 'New',
        ]);

        app(SocietyFlatsEmailService::class)->sendLeadAlert($lead);

        $delivery = EmailDelivery::query()->sole();
        $this->assertSame('sent', $delivery->status);
        $this->assertSame('lead_alert', $delivery->message_type);
        $this->assertSame('lead', $delivery->related_type);
        $this->assertSame($lead->id, $delivery->related_id);
        $this->assertSame('ad***@societyflats.test', $delivery->recipient_masked);
        $this->assertSame('email_provider_123', $delivery->provider_message_id);

        $stored = strtolower((string) json_encode($delivery->toArray()));
        $this->assertStringNotContainsString('admin@societyflats.test', $stored);
        $this->assertStringNotContainsString('buyer@example.com', $stored);
        $this->assertStringNotContainsString('private callback details', $stored);
        $this->assertStringNotContainsString('resend-test-key', $stored);

        Http::assertSent(function ($request) {
            $payload = $request->data();

            return $payload['reply_to'] === 'buyer@example.com'
                && str_contains($payload['html'], 'SocietyFlats')
                && str_contains($payload['html'], '/trust')
                && str_contains($payload['html'], '/privacy');
        });
    }

    public function test_provider_failure_and_missing_configuration_are_tracked_safely(): void
    {
        Http::fake([
            'api.resend.com/*' => Http::response(['message' => 'provider rejected request'], 422),
        ]);

        $service = app(SocietyFlatsEmailService::class);
        $service->sendTestEmail('person@example.com');

        config(['services.resend.key' => '']);
        $service->sendTestEmail('another@example.com');

        $this->assertDatabaseHas('email_deliveries', [
            'message_type' => 'test_email',
            'status' => 'failed',
            'http_status' => 422,
            'failure_reason' => 'provider_http_422',
        ]);
        $this->assertDatabaseHas('email_deliveries', [
            'message_type' => 'test_email',
            'status' => 'skipped',
            'failure_reason' => 'missing_resend_api_key',
        ]);
    }

    public function test_admin_delivery_endpoint_is_protected_and_returns_only_safe_tracking_fields(): void
    {
        EmailDelivery::create([
            'message_type' => 'lead_alert',
            'recipient_masked' => 'a***n@example.com',
            'related_type' => 'lead',
            'related_id' => 44,
            'provider' => 'resend',
            'provider_message_id' => 'email_provider_456',
            'status' => 'sent',
            'http_status' => 200,
            'metadata' => ['tracked_at' => now()->toISOString()],
        ]);

        $this->getJson('/api/admin/email-deliveries')->assertUnauthorized();

        $response = $this->withToken('admin-test-token')
            ->getJson('/api/admin/email-deliveries')
            ->assertOk()
            ->assertJsonPath('summary.sent', 1)
            ->assertJsonPath('data.data.0.recipient_masked', 'a***n@example.com');

        $payload = strtolower($response->getContent());
        $this->assertStringNotContainsString('access_token', $payload);
        $this->assertStringNotContainsString('api_key', $payload);
        $this->assertStringNotContainsString('message_body', $payload);
    }

    public function test_admin_can_send_delivery_test_to_configured_recipient_without_exposing_address(): void
    {
        Http::fake([
            'api.resend.com/*' => Http::response(['id' => 'email_test_789'], 200),
        ]);

        $this->postJson('/api/admin/email-deliveries/test')->assertUnauthorized();

        $response = $this->withToken('admin-test-token')
            ->postJson('/api/admin/email-deliveries/test')
            ->assertStatus(202)
            ->assertJsonPath('message', 'Email accepted by Resend.');

        $this->assertStringNotContainsString('admin@societyflats.test', $response->getContent());
        $this->assertDatabaseHas('email_deliveries', [
            'message_type' => 'test_email',
            'recipient_masked' => 'ad***@societyflats.test',
            'provider_message_id' => 'email_test_789',
            'status' => 'sent',
        ]);
    }

    public function test_admin_delivery_test_fails_safely_when_recipient_is_not_configured(): void
    {
        config([
            'services.societyflats_email.admin_email' => '',
            'services.societyflats_email.lead_alert_email' => '',
        ]);

        $this->withToken('admin-test-token')
            ->postJson('/api/admin/email-deliveries/test')
            ->assertUnprocessable()
            ->assertJsonPath('message', 'Configure the SocietyFlats admin email before sending a test.');

        Http::assertNothingSent();
    }
}
