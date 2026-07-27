<?php

namespace App\Http\Controllers\Api\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\EmailDelivery;
use Carbon\CarbonImmutable;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use StandardWebhooks\Webhook;
use Throwable;

class ResendWebhookController extends Controller
{
    private const EVENT_STATUSES = [
        'email.sent' => 'sent',
        'email.delivery_delayed' => 'delayed',
        'email.delivered' => 'delivered',
        'email.bounced' => 'bounced',
        'email.complained' => 'complained',
        'email.failed' => 'failed',
        'email.suppressed' => 'suppressed',
    ];

    private const STATUS_PRIORITY = [
        'skipped' => 0,
        'sent' => 10,
        'delayed' => 20,
        'delivered' => 30,
        'failed' => 40,
        'suppressed' => 50,
        'bounced' => 60,
        'complained' => 70,
    ];

    public function __invoke(Request $request): JsonResponse
    {
        $secret = (string) config('services.resend.webhook_secret');
        if ($secret === '') {
            return response()->json(['message' => 'Webhook is not configured.'], 503);
        }

        $eventId = (string) $request->header('svix-id', '');

        try {
            $event = (new Webhook($secret))->verify($request->getContent(), [
                'webhook-id' => $eventId,
                'webhook-timestamp' => (string) $request->header('svix-timestamp', ''),
                'webhook-signature' => (string) $request->header('svix-signature', ''),
            ]);
        } catch (Throwable) {
            return response()->json(['message' => 'Invalid webhook signature.'], 400);
        }

        if (! is_array($event)) {
            return response()->json(['message' => 'Invalid webhook payload.'], 400);
        }

        $eventType = (string) Arr::get($event, 'type', '');
        $status = self::EVENT_STATUSES[$eventType] ?? null;
        if ($status === null) {
            return response()->json(['received' => true]);
        }

        $providerMessageId = (string) Arr::get($event, 'data.email_id', '');
        if ($providerMessageId === '') {
            return response()->json(['received' => true]);
        }

        $delivery = EmailDelivery::query()
            ->where('provider', 'resend')
            ->where('provider_message_id', $providerMessageId)
            ->first();

        if (! $delivery) {
            return response()->json(['received' => true]);
        }

        $metadata = is_array($delivery->metadata) ? $delivery->metadata : [];
        $eventFingerprint = hash('sha256', $eventId);
        if (($metadata['last_event_fingerprint'] ?? null) === $eventFingerprint) {
            return response()->json(['received' => true]);
        }

        $eventAt = $this->safeEventTimestamp(Arr::get($event, 'created_at'));
        $lastEventAt = $this->safeEventTimestamp($metadata['last_event_at'] ?? null);
        $currentPriority = self::STATUS_PRIORITY[$delivery->status] ?? 0;
        $incomingPriority = self::STATUS_PRIORITY[$status] ?? 0;
        $isOlderEvent = $eventAt && $lastEventAt && $eventAt->lessThan($lastEventAt);

        if (! $isOlderEvent && $incomingPriority >= $currentPriority) {
            $delivery->status = $status;
            $delivery->failure_reason = match ($status) {
                'bounced' => 'provider_bounced',
                'complained' => 'provider_complaint',
                'failed' => 'provider_failed',
                'suppressed' => 'provider_suppressed',
                default => null,
            };
        }

        if (! $isOlderEvent) {
            $metadata['last_event'] = $eventType;
            $metadata['last_event_at'] = $eventAt?->toIso8601String() ?? now()->toIso8601String();
            $metadata['last_event_fingerprint'] = $eventFingerprint;
        }

        $delivery->metadata = $metadata;
        $delivery->save();

        return response()->json(['received' => true]);
    }

    private function safeEventTimestamp(mixed $value): ?CarbonImmutable
    {
        if (! is_string($value) || $value === '') {
            return null;
        }

        try {
            return CarbonImmutable::parse($value);
        } catch (Throwable) {
            return null;
        }
    }
}
