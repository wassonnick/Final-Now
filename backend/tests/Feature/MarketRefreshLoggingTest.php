<?php

namespace Tests\Feature;

use App\Models\MarketRefreshLog;
use App\Models\Society;
use App\Services\Ops\MarketSuggestionService;
use App\Services\SocietyAiEnrichmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MarketRefreshLoggingTest extends TestCase
{
    use RefreshDatabase;

    private function society(): Society
    {
        return Society::create([
            'name' => 'DLF Magnolias',
            'slug' => 'dlf-'.uniqid(),
            'sector' => 'Sector 42',
            'city' => 'Gurugram',
            'is_published' => true,
            'status' => 'Verified',
            'average_rent' => '₹1,00,000 per month',
        ]);
    }

    private function fakeAi(array $result): void
    {
        $this->app->instance(SocietyAiEnrichmentService::class, new class($result) extends SocietyAiEnrichmentService
        {
            public function __construct(private readonly array $result)
            {
            }

            public function enrichMarketDataOnly(string $name, string $sector = '', string $city = 'Gurugram'): array
            {
                return $this->result;
            }
        });
    }

    /**
     * The nightly job runs refreshAndApply(), which never logged — so the automatic path,
     * the one that actually spends the budget every night, was invisible on the admin
     * page while AI spend showed it consuming units.
     */
    public function test_the_nightly_refresh_is_recorded(): void
    {
        $this->fakeAi(['average_rent' => '₹1,25,000 per month', 'market_sources' => ['99acres'], 'confidence' => 80]);
        $society = $this->society();

        app(MarketSuggestionService::class)->refreshAndApply($society);

        $log = MarketRefreshLog::firstOrFail();
        $this->assertSame('auto_nightly', $log->trigger);
        $this->assertSame('₹1,00,000 per month', $log->before['average_rent']);
        $this->assertSame('₹1,25,000 per month', $log->after['average_rent']);
        $this->assertContains('average_rent', $log->changed_fields);
    }

    /** A search that returned nothing usable still cost money and must still be visible. */
    public function test_a_refresh_that_found_nothing_is_still_recorded(): void
    {
        $this->fakeAi(['market_sources' => []]);
        $society = $this->society();

        $this->assertNull(app(MarketSuggestionService::class)->refreshAndApply($society));

        $log = MarketRefreshLog::firstOrFail();
        $this->assertSame('auto_nightly', $log->trigger);
        $this->assertSame([], $log->changed_fields);
    }
}
