<?php

namespace Tests\Feature;

use App\Models\SocialAccount;
use App\Models\SocialAutomationSetting;
use App\Models\SocialPost;
use App\Models\SocialPublishLog;
use App\Models\Society;
use App\Services\Social\SocialAutopilotService;
use App\Services\Social\SocialManualPublisherService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SocialAutopilotTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.admin_api_token' => 'social-admin-token',
            // No AI keys: the generator uses its deterministic branded fallback, which is
            // exactly what we want deterministic tests to exercise.
            'services.claude.api_key' => '',
            'services.openai.api_key' => null,
            'services.openai.image_model' => null,
        ]);
    }

    public function test_autopilot_run_auto_approves_and_schedules_low_risk_only(): void
    {
        // NB: name must avoid substrings of the conservative risk-term list (e.g. "Autopilot"
        // contains "top"), or the classifier rightly forces every draft to high risk.
        $this->society('Rotation Society', 'rotation-society');

        $summary = app(SocialAutopilotService::class)->run(now('Asia/Kolkata')->setTime(6, 0));

        $this->assertSame(2, $summary['generated']);
        $this->assertSame(1, $summary['auto_approved'], 'Only the low-risk fallback draft may auto-approve.');
        $this->assertSame(1, $summary['scheduled']);
        $this->assertSame(1, $summary['queued_for_review']);

        $approved = SocialPost::where('status', 'approved')->firstOrFail();
        $this->assertSame('low', $approved->risk_level);
        $this->assertNotNull($approved->scheduled_at);
        $this->assertSame('scheduled', $approved->publish_status);

        $pending = SocialPost::where('status', 'needs_approval')->firstOrFail();
        $this->assertNotSame('low', $pending->risk_level, 'Non-low drafts must wait for a human.');
        $this->assertNull($pending->scheduled_at);

        $this->assertTrue(SocialPublishLog::where('action', 'autopilot_auto_approve')->where('actor', 'autopilot')->exists());
        $this->assertNotNull(SocialAutomationSetting::current()->last_run_at);
    }

    public function test_autopilot_kill_switch_generates_nothing(): void
    {
        $this->society('Paused Society', 'paused-society');
        SocialAutomationSetting::current()->update(['enabled' => false]);

        $summary = app(SocialAutopilotService::class)->run();

        $this->assertSame('autopilot_disabled', $summary['skipped']);
        $this->assertSame(0, SocialPost::count());
    }

    public function test_publish_due_publishes_scheduled_low_risk_post_to_connected_account(): void
    {
        // LinkedIn allows text-only posts; Instagram/Facebook deliberately require an
        // approved public image asset before any publish (manual or auto).
        $account = SocialAccount::create(['platform' => 'linkedin', 'account_name' => 'SF LinkedIn', 'account_id' => 'urn:li:organization:1', 'status' => 'connected']);
        $account->access_token = 'token-abc';
        $account->save();

        $post = SocialPost::create([
            'platform' => 'linkedin', 'post_type' => 'linkedin_post', 'title' => 'Due post',
            'caption' => 'Society-first search, explained simply.', 'cta' => 'Explore SocietyFlats.com',
            'hashtags' => ['#SocietyFlats'], 'risk_level' => 'low', 'status' => 'approved',
            'publish_status' => 'scheduled', 'scheduled_at' => now()->subMinutes(10),
        ]);

        Http::fake(['api.linkedin.com/*' => Http::response(['id' => 'li-post-99'], 201, ['x-restli-id' => 'li-post-99'])]);

        $summary = app(SocialAutopilotService::class)->publishDue();

        $this->assertSame(1, $summary['published']);
        $fresh = $post->fresh();
        $this->assertSame('published', $fresh->publish_status);
        $this->assertSame('li-post-99', $fresh->external_post_id);
        $this->assertNotNull($fresh->posted_at);
        $this->assertTrue(SocialPublishLog::where('action', 'autopilot_publish')->where('status', 'published')->where('actor', 'autopilot')->exists());
    }

    public function test_auto_publish_refuses_non_low_risk_and_whatsapp(): void
    {
        $account = SocialAccount::create(['platform' => 'facebook_page', 'account_name' => 'SF Page', 'account_id' => 'page-1', 'status' => 'connected']);
        $account->access_token = 'token-abc';
        $account->save();

        $medium = SocialPost::create(['platform' => 'facebook', 'post_type' => 'single_post', 'title' => 'Medium', 'caption' => 'x', 'risk_level' => 'medium', 'status' => 'approved']);
        $whatsapp = SocialPost::create(['platform' => 'whatsapp', 'post_type' => 'whatsapp_status', 'title' => 'WA', 'caption' => 'x', 'risk_level' => 'low', 'status' => 'approved']);

        $publisher = app(SocialManualPublisherService::class);

        try {
            $publisher->publishAutomatically($medium);
            $this->fail('Medium-risk post must not auto-publish.');
        } catch (\InvalidArgumentException $e) {
            $this->assertStringContainsString('low-risk', $e->getMessage());
        }

        try {
            $publisher->publishAutomatically($whatsapp);
            $this->fail('WhatsApp must not auto-publish.');
        } catch (\InvalidArgumentException $e) {
            $this->assertStringContainsString('manual-export', $e->getMessage());
        }
    }

    public function test_publish_due_respects_auto_publish_kill_switch(): void
    {
        SocialAutomationSetting::current()->update(['auto_publish_low_risk' => false]);
        SocialPost::create([
            'platform' => 'facebook', 'post_type' => 'single_post', 'title' => 'Held', 'caption' => 'x',
            'risk_level' => 'low', 'status' => 'approved', 'publish_status' => 'scheduled', 'scheduled_at' => now()->subHour(),
        ]);

        $summary = app(SocialAutopilotService::class)->publishDue();

        $this->assertSame(0, $summary['published']);
        $this->assertSame('scheduled', SocialPost::firstOrFail()->publish_status);
    }

    public function test_automation_endpoints_manage_policy_and_run(): void
    {
        $this->getJson('/api/admin/social/automation')->assertUnauthorized();

        $this->admin()->getJson('/api/admin/social/automation')->assertOk()->assertJsonPath('data.enabled', true);

        $this->admin()->patchJson('/api/admin/social/automation', ['posts_per_day' => 3, 'platforms' => ['linkedin']])
            ->assertOk()
            ->assertJsonPath('data.posts_per_day', 3)
            ->assertJsonPath('data.platforms.0', 'linkedin');

        $this->society('Endpoint Society', 'endpoint-society');
        $this->admin()->postJson('/api/admin/social/automation/run')->assertOk()->assertJsonPath('summary.generated', 3);
    }

    private function society(string $name, string $slug): Society
    {
        return Society::create([
            'name' => $name, 'slug' => $slug, 'builder' => 'Verified Builder', 'sector' => 'Sector 65',
            'locality' => 'Sector 65', 'city' => 'Gurugram', 'state' => 'Haryana',
            'description' => 'Verified society information.', 'status' => 'Verified',
            'verification_status' => 'Verified', 'is_published' => true, 'published_at' => now(), 'score' => 8.2,
        ]);
    }

    private function admin()
    {
        return $this->withHeaders(['Authorization' => 'Bearer social-admin-token']);
    }
}
