<?php

namespace Tests\Feature;

use App\Jobs\CompleteImportedSocietyDraft;
use App\Models\Society;
use App\Services\Society\Import\SocietyDraftCompletionService;
use App\Services\SocietySeoAiDraftService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SocietyDraftCompletionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token', 'services.claude.api_key' => '']);
        // Completion now grounds market prices before publish; stub it as a quiet no-op for the
        // tests that aren't about pricing (the market-specific tests re-mock with expectations).
        $this->mock(\App\Services\Ops\MarketSuggestionService::class, function ($mock) {
            $mock->shouldReceive('refreshAndApply')->byDefault()->andReturn(null);
        });
    }

    public function test_complete_draft_gets_cover_seo_and_publishes(): void
    {
        $society = $this->draft([
            'image_candidates' => [
                ['source' => 'official_url', 'url' => 'https://example.test/scraped.jpg'],
                ['source' => 'google_places', 'photo_reference' => 'ref-123', 'credit' => 'Google Places'],
            ],
        ]);

        $this->mockSeoAi();

        $result = app(SocietyDraftCompletionService::class)->complete($society);

        $this->assertTrue($result['published'], 'All gates pass so the draft must publish. Missing: '.implode(',', $result['missing']));
        $fresh = $society->fresh();
        $this->assertTrue($fresh->is_published);
        $this->assertSame('Verified', $fresh->verification_status);
        // Rights-safe Google cover approved; scraped official image was NOT auto-approved.
        $this->assertTrue((bool) $fresh->image_approved_by_admin);
        $this->assertSame('ref-123', $fresh->image_photo_reference);
        // SEO generated and live.
        $this->assertSame('published', $fresh->seoContent->status);
        $this->assertSame('Completed Estate Gurgaon | SocietyFlats', $fresh->seoContent->seo_title);
        $this->assertContains('cover_approved', $result['actions']);
        $this->assertContains('seo_published', $result['actions']);
        $this->assertContains('published', $result['actions']);
    }

    public function test_incomplete_draft_stays_in_review_and_lists_missing_gates(): void
    {
        $society = $this->draft(['score' => 0, 'image_candidates' => []]); // no score; placeholder image is allowed

        // No AI key configured -> SEO generation fails safely; nothing publishes.
        $result = app(SocietyDraftCompletionService::class)->complete($society, allowReEnrich: false);

        $this->assertFalse($result['published']);
        $fresh = $society->fresh();
        $this->assertFalse((bool) $fresh->is_published);
        $this->assertContains('score', $result['missing']);
        $this->assertNotContains('approved_cover_image', $result['missing']);
        $this->assertContains('published_seo', $result['missing']);
    }

    public function test_cover_falls_back_to_a_places_lookup_when_no_candidates_were_harvested(): void
    {
        $society = $this->draft(['image_candidates' => []]);
        $this->mockSeoAi();
        $this->mock(\App\Services\GooglePlacesSocietyImageService::class, function ($mock) {
            $mock->shouldReceive('findImageReference')->once()->andReturn([
                'photo_reference' => 'lookup-ref-7', 'place_id' => 'place-7',
                'safe_reference_url' => 'https://maps.example/ref', 'credit' => 'Google Places',
                'license_note' => 'Served via Google API with attribution.',
            ]);
        });

        $result = app(SocietyDraftCompletionService::class)->complete($society, allowReEnrich: false);

        $this->assertTrue($result['published'], 'Places-lookup cover should unblock publishing. Missing: '.implode(',', $result['missing']));
        $fresh = $society->fresh();
        $this->assertSame('lookup-ref-7', $fresh->image_photo_reference);
        $this->assertTrue((bool) $fresh->image_approved_by_admin);
    }

    public function test_completion_job_publishes_a_ready_draft(): void
    {
        $society = $this->draft([
            'image_candidates' => [['source' => 'google_places', 'photo_reference' => 'ref-9', 'credit' => 'Google Places']],
        ]);
        $this->mockSeoAi();

        (new CompleteImportedSocietyDraft($society->id))->handle(
            app(SocietyDraftCompletionService::class),
            app(\App\Services\Ops\AiBudgetGuard::class),
        );

        $this->assertTrue((bool) $society->fresh()->is_published);
    }

    public function test_completion_grounds_market_prices_before_publish(): void
    {
        // Import-time price estimates (Excel/AI extraction) are unverified. Completion must
        // replace them with the grounded portal-consensus fetch before the page goes public.
        $society = $this->draft([
            'rent_range' => '₹40,000 - ₹55,000 per month', // stale import-time estimate
            'image_candidates' => [['source' => 'google_places', 'photo_reference' => 'ref-1', 'credit' => 'Google Places']],
        ]);
        $this->mockSeoAi();

        $this->mock(\App\Services\Ops\MarketSuggestionService::class, function ($mock) use ($society) {
            $mock->shouldReceive('refreshAndApply')->once()->andReturnUsing(function ($arg) use ($society) {
                $arg->update([
                    'rent_range' => '₹62,000 - ₹85,000 per month',
                    'field_sources' => ['market' => ['refreshed_at' => now()->toIso8601String(), 'sources' => ['99acres', 'magicbricks'], 'auto_applied' => true]],
                ]);

                return ['rent_range' => '₹62,000 - ₹85,000 per month'];
            });
        });

        $result = app(SocietyDraftCompletionService::class)->complete($society, allowReEnrich: false);

        $this->assertContains('market_grounded', $result['actions']);
        $fresh = $society->fresh();
        $this->assertSame('₹62,000 - ₹85,000 per month', $fresh->rent_range, 'The grounded portal figure must replace the import-time estimate.');
        $this->assertNotNull(data_get($fresh->field_sources, 'market.refreshed_at'));
        $this->assertTrue($result['published']);
    }

    public function test_completion_skips_market_fetch_when_already_grounded(): void
    {
        // Idempotency = no double spend: a society that already carries grounded market
        // provenance must not trigger another portal fetch on re-completion.
        $society = $this->draft([
            'field_sources' => ['market' => ['refreshed_at' => now()->subDays(2)->toIso8601String(), 'auto_applied' => true]],
            'image_candidates' => [['source' => 'google_places', 'photo_reference' => 'ref-2', 'credit' => 'Google Places']],
        ]);
        $this->mockSeoAi();

        $this->mock(\App\Services\Ops\MarketSuggestionService::class, function ($mock) {
            $mock->shouldNotReceive('refreshAndApply');
        });

        $result = app(SocietyDraftCompletionService::class)->complete($society, allowReEnrich: false);

        $this->assertNotContains('market_grounded', $result['actions']);
        $this->assertTrue($result['published']);
    }

    public function test_concurrent_completion_of_the_same_society_is_skipped_not_double_billed(): void
    {
        // Prevent the double charge: if the auto-dispatched job holds the per-society lock,
        // a manual sweep on the same society must skip instead of re-running the AI pipeline.
        $society = $this->draft([
            'image_candidates' => [['source' => 'google_places', 'photo_reference' => 'ref-x', 'credit' => 'Google Places']],
        ]);

        // Simulate a completion already in flight by holding the lock.
        $lock = \Illuminate\Support\Facades\Cache::lock('society-completion:'.$society->id, 300);
        $this->assertTrue($lock->get());

        // The SEO AI must NOT be called while another completion holds the lock.
        $this->mock(SocietySeoAiDraftService::class, function ($mock) {
            $mock->shouldNotReceive('generate');
        });

        $result = app(SocietyDraftCompletionService::class)->complete($society, false, false);

        $this->assertContains('skipped_already_running', $result['actions']);
        $this->assertFalse((bool) $society->fresh()->is_published);
        $lock->release();
    }

    private function draft(array $overrides = []): Society
    {
        return Society::create(array_merge([
            'name' => 'Completed Estate', 'slug' => 'completed-estate', 'builder' => 'Verified Builder',
            'sector' => 'Sector 65', 'locality' => 'Sector 65', 'city' => 'Gurugram', 'state' => 'Haryana',
            'description' => 'A verified imported society profile with reviewed location and lifestyle context for Gurgaon residents.',
            'status' => 'Draft', 'verification_status' => 'Needs Review', 'is_published' => false,
            'score' => 8.1, 'amenities' => ['Gym', 'Clubhouse'], 'imported_at' => now(),
            'image_approved_by_admin' => false,
        ], $overrides));
    }

    private function mockSeoAi(): void
    {
        $this->mock(SocietySeoAiDraftService::class, function ($mock) {
            $mock->shouldReceive('generate')->andReturn([
                'content' => [
                    'seo_title' => 'Completed Estate Gurgaon | SocietyFlats',
                    'seo_description' => 'Verified profile for Completed Estate in Sector 65, Gurgaon.',
                    'seo_h1' => 'Completed Estate, Sector 65',
                    'intro_summary' => 'A warm, factual introduction.',
                    'about_content' => 'About content grounded in verified data.',
                    'faq_json' => [['question' => 'Is it verified?', 'answer' => 'Yes, by real people.']],
                ],
                'warnings' => [],
                'provider' => 'claude',
            ]);
        });
    }
}
