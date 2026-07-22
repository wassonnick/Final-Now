<?php

namespace App\Services;

use App\Models\Account;
use App\Models\AccountDevice;
use App\Models\AccountDevicePushReceipt;
use App\Models\SavedSearchAlert;
use App\Models\SiteVisit;
use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MobilePushNotificationService
{
    public function checkReceipts(int $limit = 100): array
    {
        $summary = ['checked' => 0, 'ok' => 0, 'failed' => 0, 'pending' => 0];

        $receipts = AccountDevicePushReceipt::query()
            ->where('status', 'queued')
            ->whereNotNull('expo_ticket_id')
            ->oldest('sent_at')
            ->limit(max(1, min($limit, 100)))
            ->get();

        if ($receipts->isEmpty()) {
            return $summary;
        }

        $summary['checked'] = $receipts->count();

        try {
            $response = Http::timeout(8)
                ->acceptJson()
                ->asJson()
                ->post((string) config('services.mobile_push.expo_receipt_endpoint'), [
                    'ids' => $receipts->pluck('expo_ticket_id')->values()->all(),
                ]);

            if (! $response->successful()) {
                $summary['pending'] = $receipts->count();
                Log::warning('Mobile push receipt lookup failed', ['status' => $response->status()]);

                return $summary;
            }

            $data = (array) $response->json('data', []);
            foreach ($receipts as $receipt) {
                $ticket = (array) data_get($data, $receipt->expo_ticket_id, []);
                if ($ticket === []) {
                    $summary['pending']++;
                    continue;
                }

                $failed = data_get($ticket, 'status') === 'error';
                $receipt->update([
                    'status' => $failed ? 'failed' : 'delivered',
                    'error_code' => data_get($ticket, 'details.error'),
                    'error_message' => data_get($ticket, 'message') ? mb_substr((string) data_get($ticket, 'message'), 0, 2000) : null,
                    'receipt_checked_at' => now(),
                    'meta' => [
                        ...($receipt->meta ?? []),
                        'receipt_status' => data_get($ticket, 'status'),
                    ],
                ]);
                $summary[$failed ? 'failed' : 'ok']++;
            }
        } catch (\Throwable $exception) {
            $summary['pending'] = $receipts->count();
            Log::warning('Mobile push receipt exception', ['message' => $exception->getMessage()]);
        }

        return $summary;
    }

    public function sendToAccount(Account $account, string $event, string $title, string $body, array $data = [], ?string $preferenceColumn = null): array
    {
        $summary = ['attempted' => 0, 'sent' => 0, 'failed' => 0, 'skipped' => 0];

        if (! (bool) config('services.mobile_push.enabled', true)) {
            $summary['skipped']++;

            return $summary;
        }

        $devices = AccountDevice::query()
            ->where('account_id', $account->id)
            ->whereNull('disabled_at')
            ->whereNotNull('expo_push_token')
            ->when($preferenceColumn, fn ($query) => $query->where($preferenceColumn, true))
            ->get();

        if ($devices->isEmpty()) {
            $summary['skipped']++;

            return $summary;
        }

        $eligibleDevices = $devices->reject(fn (AccountDevice $device) => $this->isInsideQuietHours($device))->values();
        $summary['skipped'] += $devices->count() - $eligibleDevices->count();

        foreach ($eligibleDevices->chunk(100) as $chunk) {
            $messages = $chunk->map(fn (AccountDevice $device) => [
                'to' => $device->expo_push_token,
                'sound' => 'default',
                'title' => mb_substr($title, 0, 80),
                'body' => mb_substr($body, 0, 180),
                'data' => [
                    'event' => $event,
                    ...$data,
                ],
            ])->values()->all();

            $deviceIds = $chunk->pluck('id')->values()->all();
            $summary['attempted'] += count($messages);

            try {
                $response = Http::timeout(8)
                    ->acceptJson()
                    ->asJson()
                    ->post((string) config('services.mobile_push.expo_endpoint'), $messages);

                if (! $response->successful()) {
                    $summary['failed'] += count($messages);
                    $this->recordBatchFailure($chunk, $event, 'http_'.$response->status(), 'Expo push request was not accepted.');
                    Log::warning('Mobile push batch failed', [
                        'event' => $event,
                        'account_id' => $account->id,
                        'status' => $response->status(),
                    ]);
                    continue;
                }

                $tickets = (array) $response->json('data', []);
                $failed = collect($tickets)->filter(fn ($ticket) => data_get($ticket, 'status') === 'error')->count();
                $summary['failed'] += $failed;
                $summary['sent'] += max(0, count($messages) - $failed);
                foreach ($tickets as $index => $ticket) {
                    $this->recordTicket($deviceIds[$index] ?? null, $account->id, $event, (array) $ticket);
                }
            } catch (\Throwable $exception) {
                $summary['failed'] += count($messages);
                $this->recordBatchFailure($chunk, $event, 'exception', 'Expo push request failed.');
                Log::warning('Mobile push exception', [
                    'event' => $event,
                    'account_id' => $account->id,
                    'message' => $exception->getMessage(),
                ]);
            }
        }

        return $summary;
    }

    public function sendSiteVisitReminder(SiteVisit $visit): array
    {
        $account = $this->accountForPhone($visit->visitor_phone);
        if (! $account) {
            return ['attempted' => 0, 'sent' => 0, 'failed' => 0, 'skipped' => 1];
        }

        $visit->loadMissing(['society', 'property']);
        $societyName = $visit->society?->name ?: 'your SocietyFlats visit';
        $slot = $visit->selected_slot?->format('d M, h:i A');

        return $this->sendToAccount(
            $account,
            'site_visit_reminder',
            'Site visit reminder',
            $slot ? "{$societyName} is scheduled for {$slot}." : "{$societyName} is scheduled soon.",
            [
                'site_visit_id' => $visit->id,
                'society_slug' => $visit->society?->slug,
                'property_slug' => $visit->property?->slug,
            ],
            'site_visit_reminders'
        );
    }

    public function sendSavedSearchAlert(SavedSearchAlert $alert): array
    {
        $alert->loadMissing(['account', 'property.society', 'savedSearch']);

        if (! $alert->account) {
            return ['attempted' => 0, 'sent' => 0, 'failed' => 0, 'skipped' => 1];
        }

        $title = (string) data_get($alert->payload, 'title', 'New matching home');
        $society = (string) data_get($alert->payload, 'society', $alert->property?->society?->name);

        return $this->sendToAccount(
            $alert->account,
            'saved_search_match',
            'New match for your saved search',
            trim($title.($society ? " in {$society}" : '')),
            [
                'saved_search_id' => $alert->saved_search_id,
                'property_id' => $alert->property_id,
                'property_slug' => $alert->property?->slug ?: data_get($alert->payload, 'slug'),
            ],
            'saved_search_alerts'
        );
    }

    private function accountForPhone(?string $phone): ?Account
    {
        $normalized = substr(preg_replace('/\D+/', '', (string) $phone), -10);
        if ($normalized === '') {
            return null;
        }

        return Account::query()
            ->where('phone_normalized', $normalized)
            ->where('status', 'active')
            ->first();
    }

    private function isInsideQuietHours(AccountDevice $device): bool
    {
        if (! $device->quiet_hours_enabled || ! $device->quiet_hours_start || ! $device->quiet_hours_end) {
            return false;
        }

        $timezone = $device->timezone ?: config('app.timezone', 'UTC');
        try {
            $now = CarbonImmutable::now($timezone);
        } catch (\Throwable) {
            $now = CarbonImmutable::now(config('app.timezone', 'UTC'));
        }

        [$startHour, $startMinute] = array_map('intval', explode(':', $device->quiet_hours_start));
        [$endHour, $endMinute] = array_map('intval', explode(':', $device->quiet_hours_end));

        $start = $now->setTime($startHour, $startMinute);
        $end = $now->setTime($endHour, $endMinute);

        if ($start->equalTo($end)) {
            return false;
        }

        if ($start->lessThan($end)) {
            return $now->greaterThanOrEqualTo($start) && $now->lessThan($end);
        }

        return $now->greaterThanOrEqualTo($start) || $now->lessThan($end);
    }

    private function recordTicket(?int $deviceId, int $accountId, string $event, array $ticket): void
    {
        AccountDevicePushReceipt::create([
            'account_device_id' => $deviceId,
            'account_id' => $accountId,
            'event' => $event,
            'expo_ticket_id' => data_get($ticket, 'id'),
            'status' => data_get($ticket, 'status') === 'error' ? 'failed' : 'queued',
            'error_code' => data_get($ticket, 'details.error'),
            'error_message' => data_get($ticket, 'message') ? mb_substr((string) data_get($ticket, 'message'), 0, 2000) : null,
            'sent_at' => now(),
            'meta' => [
                'provider' => 'expo',
                'ticket_status' => data_get($ticket, 'status'),
            ],
        ]);
    }

    private function recordBatchFailure($devices, string $event, string $code, string $message): void
    {
        foreach ($devices as $device) {
            AccountDevicePushReceipt::create([
                'account_device_id' => $device->id,
                'account_id' => $device->account_id,
                'event' => $event,
                'status' => 'failed',
                'error_code' => $code,
                'error_message' => $message,
                'sent_at' => now(),
                'meta' => ['provider' => 'expo'],
            ]);
        }
    }
}
