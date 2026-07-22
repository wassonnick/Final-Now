<?php

namespace App\Services;

use App\Models\Account;
use App\Models\AccountDevice;
use App\Models\SavedSearchAlert;
use App\Models\SiteVisit;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MobilePushNotificationService
{
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

        foreach ($devices->chunk(100) as $chunk) {
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

            $summary['attempted'] += count($messages);

            try {
                $response = Http::timeout(8)
                    ->acceptJson()
                    ->asJson()
                    ->post((string) config('services.mobile_push.expo_endpoint'), $messages);

                if (! $response->successful()) {
                    $summary['failed'] += count($messages);
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
            } catch (\Throwable $exception) {
                $summary['failed'] += count($messages);
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
}
