<?php

namespace Tests\Feature;

use App\Models\SeoPage;
use App\Models\SeoSearchConsoleMetric;
use App\Models\SeoTask;
use App\Services\Seo\SeoStrikingDistanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The cheapest traffic on the site, and the arithmetic behind saying so.
 *
 * Search Console showed 3,107 impressions a month at positions 11–20 while a reconciler
 * quietly closed striking-distance tasks that nothing had ever opened. These tests hold
 * the two claims that make the report worth acting on: it ranks by winnable clicks, and it
 * never promises a gain it cannot justify.
 */
class SeoStrikingDistanceTest extends TestCase
{
    use RefreshDatabase;

    private function page(string $url, array $over = []): SeoPage
    {
        return SeoPage::create(array_merge([
            'page_key' => 'society:'.md5($url), 'page_type' => 'society', 'url' => $url,
            'title' => 'A Society in Gurgaon', 'meta_description' => 'x', 'h1' => 'A Society',
            'canonical_url' => $url, 'is_indexable' => true, 'sitemap_included' => true, 'is_public' => true,
            'content_word_count' => 400, 'internal_link_count' => 6, 'image_alt_coverage' => 100,
            'schema_types' => ['WebPage'], 'freshness_at' => now(), 'metadata' => [],
        ], $over));
    }

    private function metric(array $over): SeoSearchConsoleMetric
    {
        return SeoSearchConsoleMetric::create(array_merge([
            'metric_date' => now()->subDays(3), 'page_url' => 'https://x.test/a', 'query' => 'a query',
            'clicks' => 0, 'impressions' => 100, 'ctr' => 0, 'position' => 12,
        ], $over));
    }

    private function service(): SeoStrikingDistanceService
    {
        return app(SeoStrikingDistanceService::class);
    }

    /** The observed curve is this site's own, not a published one. */
    public function test_it_reads_click_through_from_this_sites_own_data(): void
    {
        $this->metric(['position' => 2, 'impressions' => 200, 'clicks' => 20, 'query' => 'top']);
        $this->metric(['position' => 8, 'impressions' => 100, 'clicks' => 2, 'query' => 'mid']);

        $curve = $this->service()->observedCtrByBand();

        $this->assertEqualsWithDelta(0.10, $curve['1-3'], 0.001);
        $this->assertEqualsWithDelta(0.02, $curve['4-10'], 0.001);
    }

    public function test_it_ranks_opportunities_by_the_clicks_a_move_would_win(): void
    {
        $small = $this->page('https://x.test/small');
        $large = $this->page('https://x.test/large');

        // Establishes a ~5% target from the site's own page-one performance.
        $this->metric(['position' => 5, 'impressions' => 400, 'clicks' => 20, 'query' => 'already ranking']);

        $this->metric(['seo_page_id' => $small->id, 'page_url' => $small->url, 'query' => 'small chance', 'impressions' => 40, 'clicks' => 0, 'position' => 13]);
        $this->metric(['seo_page_id' => $large->id, 'page_url' => $large->url, 'query' => 'big chance', 'impressions' => 400, 'clicks' => 0, 'position' => 12]);

        $rows = $this->service()->opportunities();

        $this->assertSame('big chance', $rows->first()['query']);
        $this->assertGreaterThan($rows->last()['potential_clicks'], $rows->first()['potential_clicks']);
    }

    /** A page already beating the curve is not an opportunity dressed up as one. */
    public function test_a_page_already_performing_is_not_reported_as_an_opportunity(): void
    {
        $page = $this->page('https://x.test/good');
        $this->metric(['position' => 5, 'impressions' => 400, 'clicks' => 8, 'query' => 'baseline']);
        $this->metric(['seo_page_id' => $page->id, 'page_url' => $page->url, 'query' => 'doing well', 'impressions' => 200, 'clicks' => 60, 'position' => 6]);

        $queries = $this->service()->opportunities()->pluck('query');

        $this->assertNotContains('doing well', $queries);
    }

    public function test_it_ignores_rows_outside_striking_distance(): void
    {
        $this->metric(['position' => 5, 'impressions' => 400, 'clicks' => 20, 'query' => 'baseline']);
        $this->metric(['query' => 'buried', 'position' => 60, 'impressions' => 500, 'clicks' => 0]);
        $this->metric(['query' => 'already first', 'position' => 1.2, 'impressions' => 500, 'clicks' => 0]);
        $this->metric(['query' => 'too small to matter', 'position' => 12, 'impressions' => 3, 'clicks' => 0]);

        $queries = $this->service()->opportunities()->pluck('query');

        $this->assertNotContains('buried', $queries);
        $this->assertNotContains('already first', $queries);
        $this->assertNotContains('too small to matter', $queries);
    }

    /**
     * The page-level import pass carries no query. Counting it would report the site's
     * whole impression total as one nameless opportunity.
     */
    public function test_the_query_less_import_pass_is_never_reported(): void
    {
        $this->metric(['position' => 5, 'impressions' => 400, 'clicks' => 20, 'query' => 'baseline']);
        // The column is NOT NULL, so that pass lands as an empty string — which is exactly
        // what showed as a nameless 9,337-impression row at the top of the query report.
        $this->metric(['query' => '', 'impressions' => 9000, 'clicks' => 10, 'position' => 16]);

        foreach ($this->service()->opportunities() as $row) {
            $this->assertNotEmpty($row['query']);
        }
    }

    public function test_it_says_why_a_page_is_stuck_in_actionable_terms(): void
    {
        $page = $this->page('https://x.test/stuck', ['title' => 'Something Unrelated', 'h1' => 'Unrelated', 'internal_link_count' => 1]);
        $this->metric(['position' => 5, 'impressions' => 400, 'clicks' => 20, 'query' => 'baseline']);
        $this->metric(['seo_page_id' => $page->id, 'page_url' => $page->url, 'query' => 'sobha crescent gurgaon', 'impressions' => 200, 'clicks' => 0, 'position' => 14]);

        $gap = $this->service()->opportunities()->firstWhere('query', 'sobha crescent gurgaon')['gap'];

        $this->assertStringContainsString('page two', $gap);
        $this->assertStringContainsString('title', $gap);
        $this->assertStringContainsString('internal links', $gap);
    }

    /** Recorded as tasks so the work sits beside everything else, and is re-runnable. */
    public function test_recording_creates_one_task_per_page_and_is_idempotent(): void
    {
        $page = $this->page('https://x.test/task');
        $this->metric(['position' => 5, 'impressions' => 400, 'clicks' => 20, 'query' => 'baseline']);
        $this->metric(['seo_page_id' => $page->id, 'page_url' => $page->url, 'query' => 'worth fixing', 'impressions' => 300, 'clicks' => 0, 'position' => 12]);

        $this->assertSame(1, $this->service()->recordTasks());
        $this->service()->recordTasks();

        $tasks = SeoTask::where('task_type', 'gsc_striking_distance')->get();
        $this->assertCount(1, $tasks);
        $this->assertStringContainsString('worth fixing', $tasks->first()->title);
        $this->assertStringContainsString('impressions a month', $tasks->first()->description);
    }
}
