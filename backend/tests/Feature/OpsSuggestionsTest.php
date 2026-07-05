<?php

namespace Tests\Feature;

use App\Jobs\RefreshSocietyMarketSuggestion;
use App\Models\OpsSuggestion;
use App\Models\Society;
use App\Services\Ops\AiBudgetGuard;
use App\Services\SocietyAiEnrichmentService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class OpsSuggestionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'ops-admin-token']);
    }

    public function test_scheduler_queues_market_refresh_for_published_societies_without_pending_suggestion(): void
    {
        Queue::fake();
        $a = $this->society('Alpha', 'alpha');
        $b = $this->society('Beta', 'beta');
        $this->society('Draft Society', 'draft-society', ['is_published' => false]);
        OpsSuggestion::create(['society_id' => $b->id, 'kind' => 'market_refresh', 'status' => 'pending', 'payload' => []]);

        Artisan::call('ops:queue-market-refresh');

        Queue::assertPushed(RefreshSocietyMarketSuggestion::class, 1);
        Queue::assertPushed(RefreshSocietyMarketSuggestion::class, fn ($job) => $job->societyId === $a->id);
    }

    public function test_job_stores_pending_suggestion_without_touching_the_society(): void
    {
        $society = $this->society('Gamma', 'gamma', ['rent_range' => '₹50,000 - ₹70,000 per month']);

        $this->mock(SocietyAiEnrichmentService::class)
            ->shouldReceive('enrichMarketDataOnly')
            ->once()
            ->andReturn([
                'rent_range' => '₹55,000 - ₹78,000 per month',
                'buy_range' => '₹2.1 Cr - ₹3.4 Cr',
                'confidence' => 'medium',
                'notes' => 'Aggregated from current listings.',
                'market_sources' => [['title' => 'Listing portal', 'url' => 'https://example.test/x']],
            ]);

        (new RefreshSocietyMarketSuggestion($society->id))->handle(
            app(\App\Services\Ops\MarketSuggestionService::class),
            app(AiBudgetGuard::class),
        );

        $suggestion = OpsSuggestion::where('society_id', $society->id)->where('kind', 'market_refresh')->firstOrFail();
        $this->assertSame('pending', $suggestion->status);
        $this->assertSame('₹55,000 - ₹78,000 per month', $suggestion->payload['updates']['rent_range']);
        $this->assertSame('₹50,000 - ₹70,000 per month', $society->fresh()->rent_range, 'Society must be untouched until applied.');
    }

    public function test_budget_guard_blocks_job_when_daily_cap_is_exhausted(): void
    {
        config(['services.ops.ai_daily_call_cap' => 0]);
        $society = $this->society('Delta', 'delta');

        $ai = $this->mock(SocietyAiEnrichmentService::class);
        $ai->shouldNotReceive('enrichMarketDataOnly');

        (new RefreshSocietyMarketSuggestion($society->id))->handle(
            app(\App\Services\Ops\MarketSuggestionService::class),
            app(AiBudgetGuard::class),
        );

        $this->assertSame(0, OpsSuggestion::count());
    }

    public function test_apply_endpoint_updates_society_with_review_flags_and_resolves_suggestion(): void
    {
        $society = $this->society('Epsilon', 'epsilon');
        $suggestion = OpsSuggestion::create([
            'society_id' => $society->id, 'kind' => 'market_refresh', 'status' => 'pending',
            'payload' => [
                'updates' => ['rent_range' => '₹60,000 - ₹90,000 per month', 'buy_range' => '₹3 Cr - ₹5 Cr'],
                'confidence' => 'high', 'notes' => 'n', 'sources' => [['title' => 't', 'url' => 'https://example.test']],
            ],
        ]);

        $this->admin()->postJson("/api/admin/ops/suggestions/{$suggestion->id}/apply")
            ->assertOk()
            ->assertJsonPath('data.rent_range', '₹60,000 - ₹90,000 per month');

        $fresh = $society->fresh();
        $this->assertSame('Needs Review', $fresh->verification_status);
        $this->assertContains('rent_range', (array) $fresh->fields_to_verify);
        $this->assertSame('high', data_get($fresh->field_sources, 'market.confidence'));
        $this->assertSame('applied', $suggestion->fresh()->status);

        // Applying twice fails cleanly.
        $this->admin()->postJson("/api/admin/ops/suggestions/{$suggestion->id}/apply")->assertStatus(422);
    }

    public function test_dismiss_and_listing_endpoints(): void
    {
        $society = $this->society('Zeta', 'zeta');
        $suggestion = OpsSuggestion::create(['society_id' => $society->id, 'kind' => 'cover_photo', 'status' => 'pending', 'payload' => ['reason' => 'stale']]);

        $this->getJson('/api/admin/ops/suggestions')->assertUnauthorized();

        $this->admin()->getJson('/api/admin/ops/suggestions')
            ->assertOk()
            ->assertJsonPath('data.0.kind', 'cover_photo')
            ->assertJsonPath('data.0.society_name', 'Zeta');

        // Cover photos cannot be "applied" — they go through the image workflow.
        $this->admin()->postJson("/api/admin/ops/suggestions/{$suggestion->id}/apply")->assertStatus(422);

        $this->admin()->postJson("/api/admin/ops/suggestions/{$suggestion->id}/dismiss")->assertOk();
        $this->assertSame('dismissed', $suggestion->fresh()->status);
    }

    public function test_photo_validator_flags_stale_covers_and_clears_recovered_ones(): void
    {
        $stale = $this->society('Stale Cover', 'stale-cover', [
            'image_approved_by_admin' => true, 'image_status' => 'google_places_reference_found', 'place_id' => 'p1',
        ]);
        $healthy = $this->society('Healthy Cover', 'healthy-cover', [
            'image_approved_by_admin' => true, 'image_status' => 'google_places_reference_found', 'place_id' => 'p2',
        ]);
        OpsSuggestion::create(['society_id' => $healthy->id, 'kind' => 'cover_photo', 'status' => 'pending', 'payload' => ['reason' => 'old flag']]);

        Http::fake([
            '*stale-cover/google-place-photo*' => Http::response('nope', 404),
            '*healthy-cover/google-place-photo*' => Http::response('img', 200),
        ]);

        Artisan::call('ops:validate-photo-references');

        $this->assertSame('pending', OpsSuggestion::where('society_id', $stale->id)->where('kind', 'cover_photo')->firstOrFail()->status);
        $this->assertSame('dismissed', OpsSuggestion::where('society_id', $healthy->id)->where('kind', 'cover_photo')->firstOrFail()->status);
    }

    public function test_auto_refresh_applies_market_data_directly_and_keeps_published(): void
    {
        $society = $this->society('Auto Fresh', 'auto-fresh', [
            'rent_range' => '₹50,000 - ₹70,000 per month',
            'buy_range' => '₹2 Cr - ₹3 Cr',
            'verification_status' => 'Verified',
        ]);

        $this->mock(SocietyAiEnrichmentService::class)
            ->shouldReceive('enrichMarketDataOnly')
            ->once()
            ->andReturn([
                'rent_range' => '₹58,000 - ₹82,000 per month (updated)',
                'buy_range' => '₹2.3 Cr - ₹3.6 Cr',
                'confidence' => 'medium',
                'market_sources' => [['title' => 'Portal', 'url' => 'https://example.test']],
            ]);

        $updates = app(\App\Services\Ops\MarketSuggestionService::class)->refreshAndApply($society);

        $this->assertNotNull($updates);
        $fresh = $society->fresh();
        // Parenthetical aside stripped, applied directly, still published, still Verified.
        $this->assertSame('₹58,000 - ₹82,000 per month', $fresh->rent_range);
        $this->assertSame('₹2.3 Cr - ₹3.6 Cr', $fresh->buy_range);
        $this->assertTrue($fresh->is_published);
        $this->assertSame('Verified', $fresh->verification_status);
        $this->assertTrue((bool) data_get($fresh->field_sources, 'market.auto_applied'));
        $this->assertNotNull(data_get($fresh->field_sources, 'market.refreshed_at'));
    }

    public function test_auto_refresh_command_only_queues_stale_published_societies(): void
    {
        Queue::fake();
        $stale = $this->society('Stale Market', 'stale-market'); // no field_sources.market
        $fresh = $this->society('Fresh Market', 'fresh-market', [
            'field_sources' => ['market' => ['refreshed_at' => now()->subDays(2)->toIso8601String()]],
        ]);
        $this->society('Draft One', 'draft-one', ['is_published' => false]);

        Artisan::call('market:auto-refresh');

        Queue::assertPushed(\App\Jobs\AutoRefreshSocietyMarket::class, 1);
        Queue::assertPushed(\App\Jobs\AutoRefreshSocietyMarket::class, fn ($job) => $job->societyId === $stale->id);
    }

    public function test_admin_override_locks_fields_and_auto_refresh_leaves_them_alone(): void
    {
        $society = $this->society('Flagship', 'flagship', [
            'buy_range' => '₹5 Cr - ₹8 Cr',
            'rent_range' => '₹50,000 - ₹70,000 per month',
            'verification_status' => 'Verified',
        ]);

        $svc = app(\App\Services\Ops\MarketSuggestionService::class);

        // Admin sets the exact portal range for buy only, and locks it.
        $svc->applyOverride($society, ['buy_range' => '₹14.6 Cr - ₹40.44 Cr']);
        $society->refresh();
        $this->assertSame('₹14.6 Cr - ₹40.44 Cr', $society->buy_range);
        $this->assertSame(['buy_range'], \App\Services\Ops\MarketSuggestionService::lockedFields($society));

        // A later auto-refresh must skip buy_range but may update the unlocked rent.
        $this->mock(SocietyAiEnrichmentService::class)
            ->shouldReceive('enrichMarketDataOnly')
            ->once()
            ->andReturn([
                'buy_range' => '₹10.33 Cr - ₹28.62 Cr', // would clobber — must be ignored
                'rent_range' => '₹60,000 - ₹90,000 per month',
                'confidence' => 'medium',
                'market_sources' => [],
            ]);

        app(\App\Services\Ops\MarketSuggestionService::class)->refreshAndApply($society->fresh());

        $fresh = $society->fresh();
        $this->assertSame('₹14.6 Cr - ₹40.44 Cr', $fresh->buy_range, 'Locked buy_range must survive auto-refresh.');
        $this->assertSame('₹60,000 - ₹90,000 per month', $fresh->rent_range, 'Unlocked rent still refreshes.');
        $this->assertSame(['buy_range'], \App\Services\Ops\MarketSuggestionService::lockedFields($fresh), 'Lock persists across refresh.');
    }

    public function test_market_override_endpoint_saves_and_locks_and_can_unlock(): void
    {
        $society = $this->society('Override Endpoint', 'override-endpoint');

        $this->admin()->postJson("/api/admin/import/societies/{$society->id}/market-override", [
            'buy_range' => '₹14.6 Cr - ₹40.44 Cr',
            'rent_range' => '₹2,50,000 - ₹5,00,000 per month',
        ])->assertOk()->assertJsonPath('data.buy_range', '₹14.6 Cr - ₹40.44 Cr');

        $this->assertEqualsCanonicalizing(['buy_range', 'rent_range'], \App\Services\Ops\MarketSuggestionService::lockedFields($society->fresh()));

        // A monthly rent in crores is still rejected by the sanitizer.
        $this->admin()->postJson("/api/admin/import/societies/{$society->id}/market-override", [
            'rent_range' => '₹2 Cr - ₹3 Cr',
        ])->assertStatus(422);

        // Unlock releases the field back to automation.
        $this->admin()->postJson("/api/admin/import/societies/{$society->id}/market-override", [
            'unlock' => ['rent_range'],
        ])->assertOk();
        $this->assertSame(['buy_range'], \App\Services\Ops\MarketSuggestionService::lockedFields($society->fresh()));
    }

    public function test_sanitize_market_value_rejects_rent_in_crores_and_strips_asides(): void
    {
        $svc = \App\Services\Ops\MarketSuggestionService::class;
        // Monthly rent in crores is a units error -> rejected.
        $this->assertNull($svc::sanitizeMarketValue('rent_range', '₹2.5 - ₹3.5 Cr per month'));
        $this->assertNull($svc::sanitizeMarketValue('average_rent', '₹1.2 crore per month'));
        // Valid rent in lakh is kept.
        $this->assertSame('₹85,000 - ₹2.5 lakh per month', $svc::sanitizeMarketValue('rent_range', '₹85,000 - ₹2.5 lakh per month'));
        // Buy range in crores is fine (not a rent field).
        $this->assertSame('₹10.33 - ₹28.62 Cr', $svc::sanitizeMarketValue('buy_range', '₹10.33 - ₹28.62 Cr'));
        // Parenthetical aside stripped.
        $this->assertSame('₹3 Cr - ₹5 Cr', $svc::sanitizeMarketValue('buy_range', '₹3 Cr - ₹5 Cr (resale; 4 BHK)'));
        // Empty/null-ish rejected.
        $this->assertNull($svc::sanitizeMarketValue('rent_range', 'null'));
    }

    private function society(string $name, string $slug, array $overrides = []): Society
    {
        return Society::create(array_merge([
            'name' => $name, 'slug' => $slug, 'builder' => 'Verified Builder', 'sector' => 'Sector 65',
            'locality' => 'Sector 65', 'city' => 'Gurugram', 'state' => 'Haryana',
            'description' => 'Verified society information.', 'status' => 'Verified',
            'verification_status' => 'Verified', 'is_published' => true, 'published_at' => now(), 'score' => 8.2,
        ], $overrides));
    }

    private function admin()
    {
        return $this->withHeaders(['Authorization' => 'Bearer ops-admin-token']);
    }
}
