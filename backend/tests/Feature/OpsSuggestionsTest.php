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
