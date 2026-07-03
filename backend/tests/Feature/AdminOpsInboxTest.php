<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\OpsDigest;
use App\Models\SiteVisit;
use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AdminOpsInboxTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'ops-admin-token']);
    }

    public function test_action_inbox_is_admin_only(): void
    {
        $this->getJson('/api/admin/ops/action-inbox')->assertUnauthorized();
    }

    public function test_daily_digest_flags_quality_sla_and_sitemap_drift(): void
    {
        $healthy = $this->society('Healthy Society', 'healthy-society', [
            'source_confidence_score' => 94,
            'image_approved_by_admin' => true,
            'rent_range' => '₹50,000 - ₹80,000 per month',
        ]);
        $weak = $this->society('Weak Society', 'weak-society', [
            'source_confidence_score' => 35,
            'image_approved_by_admin' => false,
            'rent_range' => 'To be verified',
            'buy_range' => 'To be verified',
        ]);

        Lead::create(['name' => 'Fresh Lead', 'phone' => '9876543210', 'status' => 'New', 'source' => 'Website'])
            ->forceFill(['created_at' => now()->subHours(2)])->save();
        Lead::create(['name' => 'Breached Lead', 'phone' => '9876543211', 'status' => 'New', 'source' => 'Website'])
            ->forceFill(['created_at' => now()->subHours(30)])->save();
        Lead::create(['name' => 'Escalated Lead', 'phone' => '9876543212', 'status' => 'New', 'source' => 'Website'])
            ->forceFill(['created_at' => now()->subHours(80)])->save();
        Lead::create(['name' => 'Handled Lead', 'phone' => '9876543213', 'status' => 'Contacted', 'source' => 'Website'])
            ->forceFill(['created_at' => now()->subHours(90)])->save();

        SiteVisit::create([
            'lead_id' => $this->visitLead('9876500000')->id, 'confirmation_token' => 'tok-due', 'proposed_slots' => [now()->addHours(12)->toIso8601String()], 'status' => 'confirmed', 'visitor_name' => 'Due Visitor',
            'visitor_phone' => '9876500000', 'selected_slot' => now()->addHours(20), 'created_by' => 'test',
        ]);

        // Sitemap contains the healthy society only → the weak one is drift.
        Http::fake([
            '*/sitemap.xml' => Http::response(
                '<urlset><url><loc>https://www.societyflats.com/society/healthy-society</loc></url><url><loc>https://www.societyflats.com/gurgaon/sector-65</loc></url></urlset>',
                200,
            ),
        ]);

        Artisan::call('ops:daily-digest');

        $digest = OpsDigest::firstOrFail();
        $payload = $digest->payload;

        $this->assertSame(2, $payload['societies']['published_total']);
        $this->assertSame(1, $payload['societies']['low_confidence']['count']);
        $this->assertSame('Weak Society', $payload['societies']['low_confidence']['items'][0]['name']);
        $this->assertSame(1, $payload['societies']['missing_cover']['count']);
        $this->assertSame(2, $payload['societies']['missing_published_seo']['count']);
        $this->assertSame(1, $payload['societies']['missing_market_data']['count']);

        $this->assertSame(2, $payload['leads']['breaches']['count']);
        $this->assertSame(1, $payload['leads']['escalations_over_72h']['count']);
        $this->assertSame('Escalated Lead', $payload['leads']['escalations_over_72h']['items'][0]['name']);

        $this->assertSame(1, $payload['site_visits']['reminders_due']);

        $this->assertSame('drift', $payload['sitemap']['status']);
        $this->assertContains('weak-society', $payload['sitemap']['published_missing_from_sitemap']);

        // Rerunning on the same day updates the same row instead of duplicating.
        Artisan::call('ops:daily-digest');
        $this->assertSame(1, OpsDigest::count());

        $this->admin()->getJson('/api/admin/ops/action-inbox')
            ->assertOk()
            ->assertJsonPath('data.last_digest.payload.societies.low_confidence.count', 1)
            ->assertJsonPath('data.live.sitemap.status', 'skipped')
            ->assertJsonPath('data.live.leads.breaches.count', 2);

        $this->assertTrue($healthy->fresh()->is_published);
        $this->assertTrue($weak->fresh()->is_published);
    }

    public function test_visit_reminders_are_not_stamped_when_webhook_is_unconfigured(): void
    {
        config(['services.lead_notifications.enabled' => false]);
        $visit = SiteVisit::create([
            'lead_id' => $this->visitLead('9876500001')->id, 'confirmation_token' => 'tok-1', 'proposed_slots' => [now()->addHours(12)->toIso8601String()], 'status' => 'confirmed', 'visitor_name' => 'V One',
            'visitor_phone' => '9876500001', 'selected_slot' => now()->addHours(12), 'created_by' => 'test',
        ]);

        Artisan::call('site-visits:send-reminders');

        $this->assertNull($visit->fresh()->reminder_sent_at);
    }

    public function test_visit_reminders_send_and_stamp_when_webhook_is_configured(): void
    {
        config([
            'services.lead_notifications.enabled' => true,
            'services.lead_notifications.webhook_url' => 'https://hooks.example.test/notify',
        ]);
        Http::fake(['hooks.example.test/*' => Http::response(['ok' => true], 200)]);

        $due = SiteVisit::create([
            'lead_id' => $this->visitLead('9876500002')->id, 'confirmation_token' => 'tok-2', 'proposed_slots' => [now()->addHours(12)->toIso8601String()], 'status' => 'confirmed', 'visitor_name' => 'V Two',
            'visitor_phone' => '9876500002', 'selected_slot' => now()->addHours(12), 'created_by' => 'test',
        ]);
        $farOut = SiteVisit::create([
            'lead_id' => $this->visitLead('9876500003')->id, 'confirmation_token' => 'tok-3', 'proposed_slots' => [now()->addHours(12)->toIso8601String()], 'status' => 'confirmed', 'visitor_name' => 'V Three',
            'visitor_phone' => '9876500003', 'selected_slot' => now()->addDays(3), 'created_by' => 'test',
        ]);
        $alreadyReminded = SiteVisit::create([
            'lead_id' => $this->visitLead('9876500004')->id, 'confirmation_token' => 'tok-4', 'proposed_slots' => [now()->addHours(12)->toIso8601String()], 'status' => 'confirmed', 'visitor_name' => 'V Four',
            'visitor_phone' => '9876500004', 'selected_slot' => now()->addHours(10),
            'reminder_sent_at' => now()->subHour(), 'created_by' => 'test',
        ]);

        Artisan::call('site-visits:send-reminders');

        $this->assertNotNull($due->fresh()->reminder_sent_at);
        $this->assertNull($farOut->fresh()->reminder_sent_at);
        $this->assertSame(
            $alreadyReminded->reminder_sent_at->toIso8601String(),
            $alreadyReminded->fresh()->reminder_sent_at->toIso8601String(),
        );
    }

    private function visitLead(string $phone): Lead
    {
        return Lead::create(['name' => 'Visit Lead '.$phone, 'phone' => $phone, 'status' => 'Contacted', 'source' => 'Website']);
    }

    private function society(string $name, string $slug, array $overrides = []): Society
    {
        return Society::create(array_merge([
            'name' => $name,
            'slug' => $slug,
            'builder' => 'Verified Builder',
            'sector' => 'Sector 65',
            'locality' => 'Sector 65',
            'city' => 'Gurugram',
            'state' => 'Haryana',
            'description' => 'Verified society information for Gurgaon residents.',
            'status' => 'Verified',
            'verification_status' => 'Verified',
            'is_published' => true,
            'published_at' => now(),
            'score' => 8.2,
            'buy_range' => '₹2 Cr - ₹4 Cr',
            'image_approved_by_admin' => true,
        ], $overrides));
    }

    private function admin()
    {
        return $this->withHeaders(['Authorization' => 'Bearer ops-admin-token']);
    }
}
