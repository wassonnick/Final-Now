<?php

namespace Tests\Feature;

use App\Models\Society;
use App\Models\SocietySeoContent;
use App\Services\Seo\SeoMechanicalRepairService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The generator and the auditor disagreed, and nothing reconciled them.
 *
 * 493 of 526 society titles were over the auditor's 65-character limit and 492 meta
 * descriptions were outside its 90–170 band — none of them blank, all of them written by
 * a generator that was never told the rules. The result was ~1,100 tasks that could never
 * resolve. These tests hold both halves to the same numbers.
 */
class SeoMechanicalRepairTest extends TestCase
{
    use RefreshDatabase;

    private function society(array $attributes = []): Society
    {
        return Society::create(array_merge([
            'name' => 'M3M Sierra 68', 'slug' => 'm3m-sierra-68', 'sector' => 'Sector 68',
            'city' => 'Gurugram', 'builder' => 'M3M', 'status' => 'Verified', 'is_published' => true,
            'cover_image' => 'https://example.test/photo.jpg',
        ], $attributes));
    }

    private function repair(): SeoMechanicalRepairService
    {
        return app(SeoMechanicalRepairService::class);
    }

    /** A real title from production, 92 characters, must come back inside the band. */
    public function test_an_over_length_title_is_shortened_without_losing_the_name(): void
    {
        $society = $this->society();
        $title = 'M3M Sierra 68, Sector 68 Gurgaon — Ready to Move, Rent ₹35,000–₹45,000 or Buy ₹1.08–₹1.86 Cr';

        $this->assertGreaterThan(SeoMechanicalRepairService::TITLE_MAX, mb_strlen($title));

        $fixed = $this->repair()->fitTitle($title, $society);

        $this->assertLessThanOrEqual(SeoMechanicalRepairService::TITLE_MAX, mb_strlen($fixed));
        $this->assertGreaterThanOrEqual(SeoMechanicalRepairService::TITLE_MIN, mb_strlen($fixed));
        // The part that earns the click survives.
        $this->assertStringContainsString('M3M Sierra 68', $fixed);
        $this->assertStringContainsString('Sector 68', $fixed);
    }

    /** Every real title shape we saw in production lands inside the band. */
    public function test_production_title_shapes_all_land_in_range(): void
    {
        $society = $this->society();

        $titles = [
            'Emaar The Palm Drive - The Sky Terraces, Sector 66 Gurgaon | Ready to Move 3 & 4 BHK',
            'Silverglades The Ivy, Sushant Lok Phase 1, Gurugram | Ready to Move 3-5 BHK',
            'M3M Skycity Sector 65 Gurgaon | Ready Now, Rent ₹62K–₹85K or Buy ₹2.33–₹3.80 Cr',
            'Short one',
            '',
        ];

        foreach ($titles as $title) {
            $fixed = $this->repair()->fitTitle($title, $society);

            $this->assertGreaterThanOrEqual(SeoMechanicalRepairService::TITLE_MIN, mb_strlen($fixed), "too short for: {$title}");
            $this->assertLessThanOrEqual(SeoMechanicalRepairService::TITLE_MAX, mb_strlen($fixed), "too long for: {$title}");
        }
    }

    public function test_descriptions_are_brought_into_the_band_from_either_side(): void
    {
        $society = $this->society();

        $long = str_repeat('Verified society details and market ranges in Sector 68 Gurugram. ', 6);
        $short = 'A society.';

        foreach ([$long, $short, ''] as $description) {
            $fixed = $this->repair()->fitDescription($description, $society);

            $this->assertGreaterThanOrEqual(SeoMechanicalRepairService::DESCRIPTION_MIN, mb_strlen($fixed));
            $this->assertLessThanOrEqual(SeoMechanicalRepairService::DESCRIPTION_MAX, mb_strlen($fixed));
        }
    }

    /** A title already inside the band is left exactly as its author wrote it. */
    public function test_a_good_title_is_untouched(): void
    {
        $society = $this->society();
        $good = 'M3M Sierra 68, Sector 68 Gurugram | Verified';

        $this->assertSame($good, $this->repair()->fitTitle($good, $society));
    }

    public function test_alt_text_is_written_once_for_societies_that_have_a_photo(): void
    {
        $society = $this->society();

        $this->assertTrue($this->repair()->backfillAltText($society));
        $this->assertStringContainsString('M3M Sierra 68', $society->fresh()->image_alt_text);

        // Idempotent: a second pass must not rewrite an existing value.
        $this->assertFalse($this->repair()->backfillAltText($society->fresh()));
    }

    public function test_a_society_without_a_photo_gets_no_alt_text(): void
    {
        $society = $this->society(['cover_image' => null]);

        $this->assertFalse($this->repair()->backfillAltText($society));
    }

    public function test_internal_links_are_filled_to_at_least_two_and_keep_existing_ones(): void
    {
        $society = $this->society();
        $content = SocietySeoContent::create([
            'society_id' => $society->id, 'status' => 'published',
            'seo_title' => 'x', 'seo_description' => 'y',
            'internal_link_suggestions_json' => [['label' => 'Editorial pick', 'url' => '/guides/first-home']],
        ]);

        $links = $this->repair()->internalLinks($content, $society);

        $this->assertGreaterThanOrEqual(2, count($links));
        $this->assertContains('/guides/first-home', array_column($links, 'url'));
    }

    public function test_a_record_with_enough_links_is_left_alone(): void
    {
        $society = $this->society();
        $content = SocietySeoContent::create([
            'society_id' => $society->id, 'status' => 'published',
            'seo_title' => 'x', 'seo_description' => 'y',
            'internal_link_suggestions_json' => [['url' => '/a'], ['url' => '/b']],
        ]);

        $this->assertNull($this->repair()->internalLinks($content, $society));
    }

    /**
     * A page whose content metrics are estimated must not be failed on them.
     *
     * Sector and builder landing rows carry a word count derived from how many societies
     * are on the page, not from the page. Scoring that produced a permanently failing
     * depth check — and a task nobody could ever close.
     */
    public function test_estimated_metrics_are_not_scored(): void
    {
        $page = \App\Models\SeoPage::create([
            'page_key' => 'sector:test', 'page_type' => 'sector', 'url' => '/gurgaon/sector-99',
            'title' => 'Flats for Rent in Sector 99 Gurgaon | Verified Societies',
            'meta_description' => str_repeat('Verified societies with real rent ranges in Sector 99 Gurgaon. ', 2),
            'h1' => 'Sector 99 Gurgaon', 'canonical_url' => '/gurgaon/sector-99',
            'is_indexable' => true, 'sitemap_included' => true, 'is_public' => true,
            'content_word_count' => 90, 'internal_link_count' => 2, 'image_alt_coverage' => 100,
            'schema_types' => ['WebPage'], 'freshness_at' => now()->subYears(2),
            'metadata' => ['metrics_estimated' => true, 'heading_count' => 4, 'has_cta' => true, 'sector' => 'Sector 99'],
        ]);

        $audit = app(\App\Services\Seo\SeoAutopilotAuditService::class)->audit($page);
        $codes = collect($audit->issues)->pluck('code');

        $this->assertNotContains('content_depth', $codes, 'depth was scored from an estimate');
        $this->assertNotContains('internal_links', $codes);
        $this->assertNotContains('image_alt', $codes);
        $this->assertSame(0, \App\Models\SeoTask::where('seo_page_id', $page->id)
            ->whereIn('task_type', ['audit_content_depth', 'audit_internal_links', 'audit_image_alt'])->count());
    }

    /**
     * The rendered fields are the ones that matter, and they were never being repaired.
     *
     * The prerendered page ships societies.meta_title; the audit was grading the SEO
     * record's seo_title. Fixing only the record silenced the complaint and left the page
     * a searcher sees exactly as it was.
     */
    public function test_the_rendered_title_and_description_are_repaired(): void
    {
        $society = $this->society([
            'meta_title' => 'ABA Cleo County Sector 121, Noida | Luxury 3 4 BHK Ready to Move Flats',
            'meta_description' => 'Short.',
        ]);

        $this->assertSame(1, $this->repair()->repairRenderedMeta($society));

        $fresh = $society->fresh();
        $this->assertLessThanOrEqual(SeoMechanicalRepairService::TITLE_MAX, mb_strlen($fresh->meta_title));
        $this->assertGreaterThanOrEqual(SeoMechanicalRepairService::DESCRIPTION_MIN, mb_strlen($fresh->meta_description));

        // Nothing left to do on a second pass.
        $this->assertSame(0, $this->repair()->repairRenderedMeta($fresh));
    }

    /** The whole pass, over a published record that fails every mechanical check. */
    public function test_a_full_run_repairs_a_failing_record(): void
    {
        $society = $this->society();
        $content = SocietySeoContent::create([
            'society_id' => $society->id, 'status' => 'published',
            'seo_title' => 'M3M Sierra 68, Sector 68 Gurgaon — Ready to Move, Rent ₹35,000–₹45,000 or Buy ₹1.08–₹1.86 Cr',
            'seo_description' => 'Too short.',
            'internal_link_suggestions_json' => [],
        ]);

        $summary = $this->repair()->run();

        $this->assertSame(1, $summary['titles']);
        $this->assertSame(1, $summary['descriptions']);
        $this->assertSame(1, $summary['internal_links']);
        $this->assertSame(1, $summary['alt_text']);

        $fresh = $content->fresh();
        $this->assertLessThanOrEqual(SeoMechanicalRepairService::TITLE_MAX, mb_strlen($fresh->seo_title));
        $this->assertGreaterThanOrEqual(SeoMechanicalRepairService::DESCRIPTION_MIN, mb_strlen($fresh->seo_description));
    }
}
