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
