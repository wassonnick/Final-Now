<?php

namespace Tests\Feature;

use App\Jobs\AutoRefreshSocietyMarket;
use App\Models\Society;
use App\Services\Ops\MarketSuggestionService;
use App\Services\SocietyAiEnrichmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

/**
 * Two separate guards read field_sources.market.refreshed_at to decide whether a society
 * still needs a paid grounded search: the age gate in market:auto-refresh and the
 * skip-if-grounded check in draft completion. Neither was satisfied when a search came back
 * empty, so the societies that never pay off were the only ones we kept paying for.
 */
class MarketRefreshEmptyAttemptTest extends TestCase
{
    use RefreshDatabase;

    private function aiReturns(array $payload): void
    {
        $this->mock(SocietyAiEnrichmentService::class, function ($mock) use ($payload) {
            $mock->shouldReceive('enrichMarketDataOnly')->andReturn($payload);
        });
    }

    private function society(array $attributes = []): Society
    {
        return Society::create(array_merge([
            'name' => 'Express Green',
            'slug' => 'express-green-'.uniqid(),
            'sector' => 'Sector 166',
            'city' => 'Noida',
            'status' => 'Verified',
            'is_published' => true,
        ], $attributes));
    }

    /** The guard both callers read must be satisfied by an attempt, not only a success. */
    public function test_a_search_that_finds_nothing_still_records_the_attempt(): void
    {
        $this->aiReturns(['market_sources' => [['title' => 'x', 'url' => 'https://x']], 'confidence' => 20]);
        $society = $this->society();

        $this->assertNull(app(MarketSuggestionService::class)->refreshAndApply($society));

        $market = data_get($society->fresh()->field_sources, 'market');
        $this->assertNotNull($market['refreshed_at'] ?? null, 'The attempt must be recorded or it will be repeated forever.');
        $this->assertSame(1, $market['empty_attempts']);
    }

    /** A barren run must not make a society that already has figures look unsourced. */
    public function test_an_empty_run_does_not_erase_existing_provenance(): void
    {
        $society = $this->society(['field_sources' => ['market' => [
            'confidence' => 88,
            'sources' => [['title' => 'earlier', 'url' => 'https://earlier']],
            'auto_applied' => true,
            'refreshed_at' => '2026-07-01T00:00:00+00:00',
        ]]]);

        $this->aiReturns(['market_sources' => [], 'confidence' => null]);
        app(MarketSuggestionService::class)->refreshAndApply($society);

        $market = data_get($society->fresh()->field_sources, 'market');
        $this->assertSame(88, $market['confidence']);
        $this->assertTrue($market['auto_applied']);
        $this->assertSame([['title' => 'earlier', 'url' => 'https://earlier']], $market['sources']);
        $this->assertNotSame('2026-07-01T00:00:00+00:00', $market['refreshed_at'], 'The attempt still moves it down the queue.');
    }

    public function test_a_successful_run_clears_the_barren_streak(): void
    {
        $society = $this->society(['field_sources' => ['market' => ['empty_attempts' => 4]]]);

        $this->aiReturns(['rent_range' => '₹27,000 - ₹32,000 per month', 'confidence' => 80, 'market_sources' => []]);
        app(MarketSuggestionService::class)->refreshAndApply($society);

        $this->assertSame(0, data_get($society->fresh()->field_sources, 'market.empty_attempts'));
    }

    /**
     * The visible symptom: the same society refreshed every half hour while the rest of the
     * catalogue waited, because an unstamped row always sorts as the stalest.
     */
    public function test_a_society_refreshed_today_is_not_queued_again(): void
    {
        $this->aiReturns(['market_sources' => [], 'confidence' => null]);
        $society = $this->society();

        app(MarketSuggestionService::class)->refreshAndApply($society);

        Queue::fake();
        $this->artisan('market:auto-refresh')->assertSuccessful();

        Queue::assertNotPushed(AutoRefreshSocietyMarket::class);
    }

    /** An untouched society must still be picked up — the gate cannot simply block everything. */
    public function test_a_society_that_has_never_been_refreshed_is_queued(): void
    {
        $this->society();

        Queue::fake();
        $this->artisan('market:auto-refresh')->assertSuccessful();

        Queue::assertPushed(AutoRefreshSocietyMarket::class);
    }
}
