<?php

namespace Tests\Feature;

use App\Models\Society;
use App\Models\SocietyComparePage;
use App\Services\SocietyComparePageGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SocietyComparePagesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
    }

    public function test_bulk_generation_uses_only_published_societies_and_creates_review_pages(): void
    {
        $anchor = $this->society('Alpha Heights', 'alpha-heights', 'Sector 65');
        $this->society('Beta Heights', 'beta-heights', 'Sector 66');
        $this->society('Gamma Heights', 'gamma-heights', 'Sector 67');
        $this->society('Hidden Heights', 'hidden-heights', 'Sector 65', ['is_published' => false]);

        $this->withToken('admin-test-token')
            ->postJson('/api/admin/seo/compare-pages/bulk-generate')
            ->assertAccepted()
            ->assertJsonPath('summary.created', 1)
            ->assertJsonPath('summary.skipped_duplicates', 2);

        $page = SocietyComparePage::firstOrFail();

        $this->assertSame(SocietyComparePage::STATUS_NEEDS_REVIEW, $page->status);
        $this->assertNull($page->published_at);
        $this->assertContains($anchor->id, [$page->society_a_id, $page->society_b_id, $page->society_c_id]);
        $this->assertStringNotContainsString('Hidden Heights', json_encode($page->toArray()));
    }

    public function test_duplicate_triplets_are_updated_not_created_twice(): void
    {
        $this->society('Alpha Heights', 'alpha-heights', 'Sector 65');
        $this->society('Beta Heights', 'beta-heights', 'Sector 66');
        $this->society('Gamma Heights', 'gamma-heights', 'Sector 67');

        app(SocietyComparePageGenerator::class)->generateForAll();
        app(SocietyComparePageGenerator::class)->generateForAll();

        $this->assertSame(1, SocietyComparePage::query()->get()->map(function (SocietyComparePage $page) {
            return collect([$page->society_a_id, $page->society_b_id, $page->society_c_id])->sort()->values()->join('-');
        })->unique()->count());
    }

    public function test_low_quality_societies_do_not_generate_pages(): void
    {
        Society::create(['name' => 'Bare One', 'slug' => 'bare-one', 'status' => 'Verified', 'is_published' => true]);
        Society::create(['name' => 'Bare Two', 'slug' => 'bare-two', 'status' => 'Verified', 'is_published' => true]);
        Society::create(['name' => 'Bare Three', 'slug' => 'bare-three', 'status' => 'Verified', 'is_published' => true]);

        $summary = app(SocietyComparePageGenerator::class)->generateForAll();

        $this->assertSame(0, $summary['created']);
        $this->assertDatabaseCount('society_compare_pages', 0);
    }

    public function test_published_page_is_public_and_stale_page_returns_404(): void
    {
        $anchor = $this->society('Alpha Heights', 'alpha-heights', 'Sector 65');
        $this->society('Beta Heights', 'beta-heights', 'Sector 66');
        $this->society('Gamma Heights', 'gamma-heights', 'Sector 67');

        app(SocietyComparePageGenerator::class)->generateForSociety($anchor);
        $page = SocietyComparePage::firstOrFail();

        $this->getJson('/api/compare-pages/'.$page->slug)->assertNotFound();

        $this->withToken('admin-test-token')->postJson("/api/admin/seo/compare-pages/{$page->id}/approve")->assertOk();
        $this->withToken('admin-test-token')->postJson("/api/admin/seo/compare-pages/{$page->id}/publish")->assertOk();

        $this->getJson('/api/compare-pages/'.$page->slug)
            ->assertOk()
            ->assertJsonMissing(['rwa_contact']);

        $anchor->update(['is_published' => false]);

        $this->assertSame(SocietyComparePage::STATUS_STALE, $page->fresh()->status);
        $this->getJson('/api/compare-pages/'.$page->slug)->assertNotFound();
    }

    public function test_unpublish_hides_published_compare_page(): void
    {
        $anchor = $this->society('Alpha Heights', 'alpha-heights', 'Sector 65');
        $this->society('Beta Heights', 'beta-heights', 'Sector 66');
        $this->society('Gamma Heights', 'gamma-heights', 'Sector 67');

        app(SocietyComparePageGenerator::class)->generateForSociety($anchor);
        $page = SocietyComparePage::firstOrFail();
        $this->withToken('admin-test-token')->postJson("/api/admin/seo/compare-pages/{$page->id}/approve")->assertOk();
        $this->withToken('admin-test-token')->postJson("/api/admin/seo/compare-pages/{$page->id}/publish")->assertOk();

        $this->getJson('/api/compare-pages/'.$page->slug)->assertOk();

        $this->withToken('admin-test-token')->postJson("/api/admin/seo/compare-pages/{$page->id}/unpublish")->assertOk();

        $this->getJson('/api/compare-pages/'.$page->slug)->assertNotFound();
    }

    public function test_rebuild_repairs_stale_page_in_place_preserving_slug(): void
    {
        $anchor = $this->society('Alpha Heights', 'alpha-heights', 'Sector 65');
        $this->society('Beta Heights', 'beta-heights', 'Sector 66');
        $this->society('Gamma Heights', 'gamma-heights', 'Sector 67');

        app(SocietyComparePageGenerator::class)->generateForSociety($anchor);
        $page = SocietyComparePage::firstOrFail();
        $originalSlug = $page->slug;

        // The 14-day market refresh path: a material change stales the page.
        $anchor->update(['rent_range' => '₹65k–₹1.1L']);
        $this->assertSame(SocietyComparePage::STATUS_STALE, $page->fresh()->status);

        $status = app(SocietyComparePageGenerator::class)->rebuildPage($page->fresh()->load(['societyA', 'societyB', 'societyC']), autoPublish: true);

        $page->refresh();
        $this->assertSame(SocietyComparePage::STATUS_PUBLISHED, $status);
        $this->assertSame(SocietyComparePage::STATUS_PUBLISHED, $page->status);
        $this->assertSame($originalSlug, $page->slug);
        $this->assertNotNull($page->published_at);
        $this->assertDatabaseCount('society_compare_pages', 1);
    }

    public function test_rebuild_refuses_when_a_society_is_no_longer_public(): void
    {
        $anchor = $this->society('Alpha Heights', 'alpha-heights', 'Sector 65');
        $this->society('Beta Heights', 'beta-heights', 'Sector 66');
        $this->society('Gamma Heights', 'gamma-heights', 'Sector 67');

        app(SocietyComparePageGenerator::class)->generateForSociety($anchor);
        $page = SocietyComparePage::firstOrFail();

        $anchor->update(['is_published' => false]);

        $status = app(SocietyComparePageGenerator::class)->rebuildPage($page->fresh()->load(['societyA', 'societyB', 'societyC']), autoPublish: true);

        $this->assertNull($status);
        $this->assertSame(SocietyComparePage::STATUS_STALE, $page->fresh()->status);
    }

    public function test_generated_copy_is_data_led_not_boilerplate(): void
    {
        $anchor = $this->society('Alpha Heights', 'alpha-heights', 'Sector 65', ['score' => 9.1, 'rent_range' => '₹85,000 - ₹1.4L']);
        $this->society('Beta Heights', 'beta-heights', 'Sector 66', ['score' => 8.2, 'rent_range' => '₹55,000 - ₹90,000']);
        $this->society('Gamma Heights', 'gamma-heights', 'Sector 67', ['score' => 7.8]);

        app(SocietyComparePageGenerator::class)->generateForSociety($anchor);
        $page = SocietyComparePage::firstOrFail();

        // The score leader and real values must appear — every claim quotes published data.
        $this->assertStringContainsString('Alpha Heights leads', $page->comparison_summary);
        $this->assertStringContainsString('9.1', $page->comparison_summary);
        $labels = collect($page->best_for_json)->pluck('label');
        $this->assertSame($labels->count(), $labels->unique()->count(), 'best-for labels must be distinct per society');
        $this->assertStringContainsString('highest SocietyFlats overall score', json_encode($page->faq_json));
    }

    public function test_registry_sync_registers_published_compare_pages_and_drops_stale_ones(): void
    {
        $anchor = $this->society('Alpha Heights', 'alpha-heights', 'Sector 65');
        $this->society('Beta Heights', 'beta-heights', 'Sector 66');
        $this->society('Gamma Heights', 'gamma-heights', 'Sector 67');

        app(SocietyComparePageGenerator::class)->generateForSociety($anchor);
        $page = SocietyComparePage::firstOrFail();
        $page->update(['status' => SocietyComparePage::STATUS_PUBLISHED, 'published_at' => now()]);

        app(\App\Services\Seo\SeoPageRegistryService::class)->sync();
        $seoPage = \App\Models\SeoPage::where('page_key', 'compare:'.$page->id)->firstOrFail();
        $this->assertTrue($seoPage->is_public);
        $this->assertTrue($seoPage->sitemap_included);
        $this->assertSame('/compare/'.$page->slug, $seoPage->url);
        $this->assertGreaterThan(100, $seoPage->content_word_count);

        $page->update(['status' => SocietyComparePage::STATUS_STALE, 'published_at' => null]);
        app(\App\Services\Seo\SeoPageRegistryService::class)->sync();
        $this->assertFalse($seoPage->fresh()->is_public);
        $this->assertFalse($seoPage->fresh()->sitemap_included);
    }

    public function test_nightly_autopilot_publishes_quality_pages_and_repairs_stale_ones(): void
    {
        // Trip the AI breaker so the society-SEO step short-circuits: the compare step is
        // deterministic and must work even when the AI budget is exhausted.
        app(\App\Services\Ops\AiBudgetGuard::class)->tripProviderLimit();
        \App\Models\SeoAutomationSetting::create(['enabled' => true, 'audit_enabled' => false, 'technical_checks_enabled' => false, 'search_console_enabled' => false, 'keyword_refresh_enabled' => false, 'draft_generation_enabled' => false, 'reports_enabled' => false, 'auto_publish_enabled' => true, 'drafts_per_run' => 5, 'timezone' => 'Asia/Kolkata', 'auto_publish_min_confidence' => 80]);

        $anchor = $this->society('Alpha Heights', 'alpha-heights', 'Sector 65');
        $this->society('Beta Heights', 'beta-heights', 'Sector 66');
        $this->society('Gamma Heights', 'gamma-heights', 'Sector 67');

        // First run: generates coverage for uncovered societies AND publishes it (quality 90).
        $run = app(\App\Services\Seo\SeoAutopilotRunner::class)->run('manual');
        $page = SocietyComparePage::firstOrFail();
        $this->assertSame(SocietyComparePage::STATUS_PUBLISHED, $page->status);
        $this->assertGreaterThanOrEqual(1, $run->summary['compare_pages']['published']);
        $this->assertTrue(\App\Models\SeoPage::where('page_key', 'compare:'.$page->id)->where('is_public', true)->exists());

        // Market refresh stales it; the next nightly run must repair and republish in place.
        $anchor->update(['rent_range' => '₹70k–₹1.2L']);
        $this->assertSame(SocietyComparePage::STATUS_STALE, $page->fresh()->status);

        app(\App\Services\Seo\SeoAutopilotRunner::class)->run('manual');
        $this->assertSame(SocietyComparePage::STATUS_PUBLISHED, $page->fresh()->status);
    }

    public function test_public_index_filters_by_society_id(): void
    {
        $anchor = $this->society('Alpha Heights', 'alpha-heights', 'Sector 65');
        $this->society('Beta Heights', 'beta-heights', 'Sector 66');
        $other = $this->society('Gamma Heights', 'gamma-heights', 'Sector 67');

        app(SocietyComparePageGenerator::class)->generateForSociety($anchor);
        $page = SocietyComparePage::firstOrFail();
        $page->update(['status' => SocietyComparePage::STATUS_PUBLISHED, 'published_at' => now()]);

        $this->getJson('/api/compare-pages?society_id='.$anchor->id)->assertOk()->assertJsonPath('data.data.0.slug', $page->slug);

        $unrelated = Society::create(['name' => 'Lonely', 'slug' => 'lonely', 'status' => 'Verified', 'is_published' => true]);
        $this->getJson('/api/compare-pages?society_id='.$unrelated->id)->assertOk()->assertJsonPath('data.data', []);
    }

    private function society(string $name, string $slug, string $sector, array $overrides = []): Society
    {
        return Society::create(array_merge([
            'name' => $name,
            'slug' => $slug,
            'builder' => 'Test Builder',
            'sector' => $sector,
            'locality' => 'Golf Course Extension Road',
            'city' => 'Gurgaon',
            'description' => "{$name} is a published society profile for safe comparison testing.",
            'status' => 'Verified',
            'is_published' => true,
            'score' => 8.4,
            'connectivity_score' => 8.1,
            'lifestyle_score' => 8.0,
            'amenities' => ['Clubhouse', 'Gym', 'Swimming Pool', '24x7 Security'],
            'nearby_schools' => ['School A — verified public result'],
            'nearby_metro' => ['Metro — verified public result'],
            'rent_range' => '₹55k–₹90k',
            'buy_range' => '₹2.4–3.8 Cr',
            'rwa_contact' => 'private-admin-field',
        ], $overrides));
    }
}
