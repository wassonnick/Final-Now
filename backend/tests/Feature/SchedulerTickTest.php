<?php

namespace Tests\Feature;

use App\Services\Ops\AiBudgetGuard;
use App\Services\Ops\SchedulerHeartbeat;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SchedulerTickTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        // The catch-up runs real automation commands; stub the network and trip the AI budget
        // so the audit/market/social/completion steps short-circuit instead of calling out.
        Http::fake(['*' => Http::response('ok', 200)]);
        app(AiBudgetGuard::class)->tripProviderLimit();
    }

    public function test_scheduler_tick_requires_the_secret_token(): void
    {
        config(['services.ops.scheduler_token' => 'tick-secret']);

        $this->postJson('/api/ops/scheduler-tick')->assertForbidden();
        $this->postJson('/api/ops/scheduler-tick', [], ['X-Scheduler-Token' => 'wrong'])->assertForbidden();
    }

    public function test_scheduler_tick_is_disabled_when_no_token_configured(): void
    {
        config(['services.ops.scheduler_token' => null]);

        // Even a request with any header is rejected while the endpoint is unconfigured.
        $this->postJson('/api/ops/scheduler-tick', [], ['X-Scheduler-Token' => ''])->assertForbidden();
    }

    public function test_valid_tick_runs_and_stamps_the_heartbeat(): void
    {
        config(['services.ops.scheduler_token' => 'tick-secret']);
        $this->assertNull(Cache::get(SchedulerHeartbeat::CACHE_KEY));

        $this->postJson('/api/ops/scheduler-tick', [], ['X-Scheduler-Token' => 'tick-secret'])
            ->assertOk()
            ->assertJsonPath('status', 'ok');

        $this->assertNotNull(Cache::get(SchedulerHeartbeat::CACHE_KEY));
        $this->assertTrue(SchedulerHeartbeat::status()['healthy']);
    }

    public function test_daily_catchup_runs_seo_once_per_day_after_its_hour(): void
    {
        // Before 02:00 nothing fires; after, it runs once and marks the day done.
        \Illuminate\Support\Carbon::setTestNow(\Illuminate\Support\Carbon::today()->setHour(1));
        $this->artisan('ops:daily-catchup')->assertSuccessful();
        $this->assertNull(Cache::get('ops:daily-ran:seo-autopilot'));

        \Illuminate\Support\Carbon::setTestNow(\Illuminate\Support\Carbon::today()->setHour(9));
        $this->artisan('ops:daily-catchup')->assertSuccessful();
        $this->assertSame(now()->toDateString(), Cache::get('ops:daily-ran:seo-autopilot'));

        \Illuminate\Support\Carbon::setTestNow();
    }
}
