<?php

namespace Tests\Feature;

use App\Services\Ops\SchedulerHeartbeat;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SchedulerHeartbeatTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
    }

    public function test_stats_reports_unhealthy_when_no_heartbeat_exists(): void
    {
        $this->withHeaders(['Authorization' => 'Bearer admin-test-token'])
            ->getJson('/api/admin/stats')
            ->assertOk()
            ->assertJsonPath('scheduler.healthy', false)
            ->assertJsonPath('scheduler.last_heartbeat_at', null);
    }

    public function test_stats_reports_healthy_with_a_fresh_heartbeat_and_stale_after_ten_minutes(): void
    {
        Cache::put(SchedulerHeartbeat::CACHE_KEY, now()->subMinutes(2)->toIso8601String(), now()->addDay());
        $this->withHeaders(['Authorization' => 'Bearer admin-test-token'])
            ->getJson('/api/admin/stats')
            ->assertOk()
            ->assertJsonPath('scheduler.healthy', true);

        Cache::put(SchedulerHeartbeat::CACHE_KEY, now()->subMinutes(45)->toIso8601String(), now()->addDay());
        $this->withHeaders(['Authorization' => 'Bearer admin-test-token'])
            ->getJson('/api/admin/stats')
            ->assertOk()
            ->assertJsonPath('scheduler.healthy', false)
            ->assertJsonPath('scheduler.minutes_since', 45);
    }

    public function test_running_the_schedule_stamps_the_heartbeat(): void
    {
        $this->assertNull(Cache::get(SchedulerHeartbeat::CACHE_KEY));

        $this->artisan('schedule:test', ['--name' => 'scheduler-heartbeat'])->assertSuccessful();

        $this->assertNotNull(Cache::get(SchedulerHeartbeat::CACHE_KEY));
        $this->assertTrue(SchedulerHeartbeat::status()['healthy']);
    }
}
