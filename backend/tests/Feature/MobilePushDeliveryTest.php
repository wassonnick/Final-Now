<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AccountDevice;
use App\Models\AccountDevicePushReceipt;
use App\Models\Lead;
use App\Models\Property;
use App\Models\SavedSearch;
use App\Models\SiteVisit;
use App\Models\Society;
use App\Services\SavedSearchMatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class MobilePushDeliveryTest extends TestCase
{
    use RefreshDatabase;

    public function test_saved_search_match_sends_mobile_push_without_exposing_token(): void
    {
        config([
            'services.mobile_push.enabled' => true,
            'services.saved_search_alerts.enabled' => false,
        ]);

        Http::fake([
            'https://exp.host/*' => Http::response(['data' => [['status' => 'ok', 'id' => 'ticket-1']]], 200),
        ]);

        $account = $this->account('9999999995');
        AccountDevice::create([
            'account_id' => $account->id,
            'device_id' => 'ios-push-search',
            'platform' => 'ios',
            'expo_push_token' => 'ExpoPushToken[savedSearchDevice]',
            'saved_search_alerts' => true,
            'last_registered_at' => now(),
        ]);

        $society = Society::create(['name' => 'Push Society', 'slug' => 'push-society', 'status' => 'Verified', 'is_published' => true]);
        Property::create([
            'society_id' => $society->id,
            'title' => 'Push matching home',
            'slug' => 'push-matching-home',
            'listing_type' => 'Rent',
            'status' => 'Live',
            'verified' => true,
            'verified_at' => now(),
            'availability_checked_at' => now(),
            'published_at' => now(),
            'price' => '65000',
        ]);
        SavedSearch::create([
            'account_id' => $account->id,
            'name' => 'Push rentals',
            'filters' => ['tab' => 'rent'],
            'alert_enabled' => true,
            'alert_channel' => 'push',
            'alert_frequency' => 'daily',
        ]);

        $summary = app(SavedSearchMatcher::class)->run(true);

        $this->assertSame(1, $summary['matches_created']);
        $this->assertSame(1, $summary['sent']);
        $this->assertDatabaseHas('saved_search_alerts', ['status' => 'sent']);
        $this->assertDatabaseHas('account_device_push_receipts', [
            'event' => 'saved_search_match',
            'expo_ticket_id' => 'ticket-1',
            'status' => 'queued',
        ]);

        Http::assertSent(function ($request) {
            $payload = $request->data();

            return $request->url() === 'https://exp.host/--/api/v2/push/send'
                && data_get($payload, '0.title') === 'New match for your saved search'
                && data_get($payload, '0.data.event') === 'saved_search_match'
                && data_get($payload, '0.to') === 'ExpoPushToken[savedSearchDevice]';
        });
    }

    public function test_site_visit_reminder_command_uses_mobile_push_when_webhook_is_absent(): void
    {
        config([
            'services.mobile_push.enabled' => true,
            'services.lead_notifications.enabled' => false,
        ]);

        Http::fake([
            'https://exp.host/*' => Http::response(['data' => [['status' => 'ok', 'id' => 'ticket-visit']]], 200),
        ]);

        $account = $this->account('9999999994');
        AccountDevice::create([
            'account_id' => $account->id,
            'device_id' => 'ios-site-visit',
            'platform' => 'ios',
            'expo_push_token' => 'ExpoPushToken[siteVisitDevice]',
            'site_visit_reminders' => true,
            'last_registered_at' => now(),
        ]);

        $lead = Lead::create([
            'name' => 'Visit Push Customer',
            'phone' => '9999999994',
            'source' => 'property_page',
            'status' => 'Site Visit',
            'priority' => 'Hot',
            'society_name' => 'Visit Push Society',
        ]);

        $visit = SiteVisit::create([
            'lead_id' => $lead->id,
            'confirmation_token' => Str::random(64),
            'proposed_slots' => [now()->addHours(6)->toISOString()],
            'selected_slot' => now()->addHours(6),
            'status' => 'confirmed',
            'visitor_name' => 'Visit Push Customer',
            'visitor_phone' => '9999999994',
        ]);

        $this->artisan('site-visits:send-reminders')
            ->assertExitCode(0);

        $this->assertNotNull($visit->fresh()->reminder_sent_at);

        Http::assertSent(fn ($request) => $request->url() === 'https://exp.host/--/api/v2/push/send'
            && data_get($request->data(), '0.data.event') === 'site_visit_reminder'
        );
    }

    public function test_quiet_hours_skip_push_delivery_without_marking_alert_sent(): void
    {
        config([
            'services.mobile_push.enabled' => true,
            'services.saved_search_alerts.enabled' => false,
        ]);

        Http::fake([
            'https://exp.host/*' => Http::response(['data' => [['status' => 'ok', 'id' => 'ticket-skipped']]], 200),
        ]);

        $account = $this->account('9999999993');
        AccountDevice::create([
            'account_id' => $account->id,
            'device_id' => 'quiet-device',
            'platform' => 'ios',
            'expo_push_token' => 'ExpoPushToken[quietDevice]',
            'saved_search_alerts' => true,
            'quiet_hours_enabled' => true,
            'quiet_hours_start' => '00:00',
            'quiet_hours_end' => '23:59',
            'timezone' => config('app.timezone'),
            'last_registered_at' => now(),
        ]);

        $society = Society::create(['name' => 'Quiet Society', 'slug' => 'quiet-society', 'status' => 'Verified', 'is_published' => true]);
        Property::create([
            'society_id' => $society->id,
            'title' => 'Quiet matching home',
            'slug' => 'quiet-matching-home',
            'listing_type' => 'Rent',
            'status' => 'Live',
            'verified' => true,
            'verified_at' => now(),
            'availability_checked_at' => now(),
            'published_at' => now(),
            'price' => '75000',
        ]);
        SavedSearch::create([
            'account_id' => $account->id,
            'name' => 'Quiet rentals',
            'filters' => ['tab' => 'rent'],
            'alert_enabled' => true,
            'alert_channel' => 'push',
            'alert_frequency' => 'daily',
        ]);

        $summary = app(SavedSearchMatcher::class)->run(true);

        $this->assertSame(1, $summary['matches_created']);
        $this->assertSame(0, $summary['sent']);
        $this->assertDatabaseHas('saved_search_alerts', ['status' => 'pending']);
        Http::assertNothingSent();
    }

    public function test_push_receipt_checker_marks_failed_receipts(): void
    {
        $account = $this->account('9999999992');
        $device = AccountDevice::create([
            'account_id' => $account->id,
            'device_id' => 'receipt-device',
            'platform' => 'ios',
            'expo_push_token' => 'ExpoPushToken[receiptDevice]',
            'last_registered_at' => now(),
        ]);
        AccountDevicePushReceipt::create([
            'account_device_id' => $device->id,
            'account_id' => $account->id,
            'event' => 'saved_search_match',
            'expo_ticket_id' => 'ticket-failed',
            'status' => 'queued',
            'sent_at' => now(),
        ]);

        Http::fake([
            'https://exp.host/--/api/v2/push/getReceipts' => Http::response([
                'data' => [
                    'ticket-failed' => [
                        'status' => 'error',
                        'message' => 'Device is not registered.',
                        'details' => ['error' => 'DeviceNotRegistered'],
                    ],
                ],
            ], 200),
        ]);

        $this->artisan('mobile-push:check-receipts')
            ->assertExitCode(0);

        $this->assertDatabaseHas('account_device_push_receipts', [
            'expo_ticket_id' => 'ticket-failed',
            'status' => 'failed',
            'error_code' => 'DeviceNotRegistered',
        ]);
    }

    private function account(string $phone): Account
    {
        return Account::create([
            'role' => 'customer',
            'phone' => $phone,
            'phone_normalized' => $phone,
            'name' => 'Push User',
            'status' => 'active',
        ]);
    }
}
