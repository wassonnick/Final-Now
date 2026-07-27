<?php

namespace Tests\Feature;

use App\Models\EmailDelivery;
use Illuminate\Foundation\Testing\RefreshDatabase;
use StandardWebhooks\Webhook;
use Tests\TestCase;

class ResendWebhookTest extends TestCase
{
    use RefreshDatabase;

    private string $rawSecret = 'societyflats-webhook-test-secret';

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.resend.webhook_secret' => 'whsec_'.base64_encode($this->rawSecret),
        ]);
    }

    public function test_verified_delivery_event_updates_tracked_email_without_storing_payload_content(): void
    {
        $delivery = $this->delivery();
        $response = $this->postSignedEvent('email.delivered', $delivery->provider_message_id, [
            'from' => 'secret-sender@example.com',
            'to' => ['private-recipient@example.com'],
            'subject' => 'Private subject',
        ]);

        $response->assertOk()->assertJson(['received' => true]);

        $delivery->refresh();
        $this->assertSame('delivered', $delivery->status);
        $stored = strtolower((string) json_encode($delivery->toArray()));
        $this->assertStringNotContainsString('secret-sender@example.com', $stored);
        $this->assertStringNotContainsString('private-recipient@example.com', $stored);
        $this->assertStringNotContainsString('private subject', $stored);
        $this->assertStringNotContainsString($this->rawSecret, $stored);
    }

    public function test_bounce_complaint_and_suppression_use_safe_status_and_reason(): void
    {
        foreach ([
            'email.bounced' => ['bounced', 'provider_bounced'],
            'email.complained' => ['complained', 'provider_complaint'],
            'email.suppressed' => ['suppressed', 'provider_suppressed'],
        ] as $event => [$status, $reason]) {
            $delivery = $this->delivery('provider-'.str_replace('.', '-', $event));
            $this->postSignedEvent($event, $delivery->provider_message_id, [
                'bounce' => ['message' => 'Raw private provider diagnostic'],
            ])->assertOk();

            $delivery->refresh();
            $this->assertSame($status, $delivery->status);
            $this->assertSame($reason, $delivery->failure_reason);
            $this->assertStringNotContainsString(
                'raw private provider diagnostic',
                strtolower((string) json_encode($delivery->toArray()))
            );
        }
    }

    public function test_invalid_signature_is_rejected_and_unknown_email_is_acknowledged(): void
    {
        $delivery = $this->delivery();

        $this->withHeaders([
            'svix-id' => 'invalid-event',
            'svix-timestamp' => (string) time(),
            'svix-signature' => 'v1,invalid',
        ])->postJson('/api/webhooks/resend', [
            'type' => 'email.delivered',
            'data' => ['email_id' => $delivery->provider_message_id],
        ])->assertStatus(400);

        $this->assertSame('sent', $delivery->fresh()->status);

        $this->postSignedEvent('email.delivered', 'unknown-provider-id')
            ->assertOk()
            ->assertJson(['received' => true]);
    }

    public function test_duplicate_and_older_events_do_not_regress_terminal_delivery_state(): void
    {
        $delivery = $this->delivery();

        $this->postSignedEvent('email.complained', $delivery->provider_message_id, [], '2026-07-27T12:00:00Z', 'event-latest')
            ->assertOk();
        $this->postSignedEvent('email.delivered', $delivery->provider_message_id, [], '2026-07-27T11:00:00Z', 'event-older')
            ->assertOk();
        $this->postSignedEvent('email.complained', $delivery->provider_message_id, [], '2026-07-27T12:00:00Z', 'event-latest')
            ->assertOk();

        $this->assertSame('complained', $delivery->fresh()->status);
    }

    private function delivery(string $providerMessageId = 'provider-email-123'): EmailDelivery
    {
        return EmailDelivery::create([
            'message_type' => 'lead_alert',
            'recipient_masked' => 'ad***@example.com',
            'provider' => 'resend',
            'provider_message_id' => $providerMessageId,
            'status' => 'sent',
            'http_status' => 200,
            'metadata' => ['tracked_at' => now()->toIso8601String()],
        ]);
    }

    private function postSignedEvent(
        string $type,
        string $emailId,
        array $extraData = [],
        ?string $createdAt = null,
        ?string $eventId = null
    ) {
        $eventId ??= 'event-'.bin2hex(random_bytes(6));
        $timestamp = time();
        $payload = json_encode([
            'type' => $type,
            'created_at' => $createdAt ?? now()->toIso8601String(),
            'data' => ['email_id' => $emailId] + $extraData,
        ], JSON_THROW_ON_ERROR);
        $signature = Webhook::fromRaw($this->rawSecret)->sign($eventId, $timestamp, $payload);

        return $this->call('POST', '/api/webhooks/resend', [], [], [], [
            'CONTENT_TYPE' => 'application/json',
            'HTTP_SVIX_ID' => $eventId,
            'HTTP_SVIX_TIMESTAMP' => (string) $timestamp,
            'HTTP_SVIX_SIGNATURE' => $signature,
        ], $payload);
    }
}
