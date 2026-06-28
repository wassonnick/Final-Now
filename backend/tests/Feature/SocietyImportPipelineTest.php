<?php

namespace Tests\Feature;

use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SocietyImportPipelineTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.admin_api_token' => 'admin-test-token',
            'services.ai_import_provider' => 'gemini',
            'services.gemini.api_key' => 'gemini-test-key',
            'services.gemini.model' => 'test-model',
            'services.google_places_api_key' => 'places-test-key',
        ]);
    }

    public function test_single_import_assembles_authoritative_draft_with_scores_and_images(): void
    {
        Http::fake([
            'maps.googleapis.com/maps/api/place/findplacefromtext/*' => Http::response([
                'status' => 'OK', 'candidates' => [['place_id' => 'place-magnolias']],
            ]),
            'maps.googleapis.com/maps/api/place/details/*' => Http::response([
                'status' => 'OK',
                'result' => [
                    'place_id' => 'place-magnolias',
                    'name' => 'DLF Magnolias',
                    'formatted_address' => 'Sector 42, Golf Course Road, Gurugram, Haryana 122002, India',
                    'geometry' => ['location' => ['lat' => 28.4421, 'lng' => 77.1025]],
                    'url' => 'https://maps.google.com/?cid=99',
                    'website' => 'https://builder.example.com',
                    'rating' => 4.5,
                    'user_ratings_total' => 820,
                    'photos' => [['photo_reference' => 'ref-1'], ['photo_reference' => 'ref-2']],
                    'address_components' => [
                        ['long_name' => 'Golf Course Road', 'types' => ['sublocality_level_1', 'sublocality']],
                        ['long_name' => 'Gurugram', 'types' => ['locality']],
                        ['long_name' => 'Haryana', 'types' => ['administrative_area_level_1']],
                    ],
                ],
            ]),
            'maps.googleapis.com/maps/api/place/nearbysearch/*' => Http::response([
                'status' => 'OK',
                'results' => [
                    ['name' => 'Local POI', 'vicinity' => 'Sector 43', 'rating' => 4.2, 'geometry' => ['location' => ['lat' => 28.4450, 'lng' => 77.1040]]],
                ],
            ]),
            'generativelanguage.googleapis.com/*' => Http::response([
                'candidates' => [['content' => ['parts' => [['text' => json_encode([
                    'name' => 'DLF Magnolias',
                    'builder' => 'DLF',
                    'description' => 'A grounded, review-safe description of the society for admin verification before publishing.',
                    'project_status' => 'Ready to Move',
                    'possession_date' => 'Delivered',
                    'year_built' => '2014',
                    'amenities' => ['Clubhouse', 'Swimming Pool', 'Gym', 'Tennis Court', '24x7 Security', 'CCTV', 'Concierge'],
                    'rent_range' => '₹2,50,000 - ₹4,00,000',
                    'buy_range' => '₹12 Cr - ₹20 Cr',
                    'rental_yield' => '3.2%',
                    'official_project_url' => 'https://builder.example.com/magnolias',
                    'meta_title' => 'DLF Magnolias Gurgaon',
                    'meta_description' => 'Grounded project profile for review.',
                    'source_confidence_score' => 82,
                ])]]]]],
            ]),
            'builder.example.com/*' => Http::response(
                '<html><head><meta property="og:image" content="https://builder.example.com/hero.jpg"></head><body><img src="/img/tower.jpg"><img src="logo.png"></body></html>',
                200,
                ['Content-Type' => 'text/html']
            ),
        ]);

        $this->withToken('admin-test-token')
            ->postJson('/api/admin/import/single', ['name' => 'DLF Magnolias', 'location' => 'Sector 42 Gurgaon', 'include_images' => true])
            ->assertAccepted();

        $this->withToken('admin-test-token')->getJson('/api/admin/import/jobs?limit=5')->assertOk();

        $society = Society::where('name', 'DLF Magnolias')->firstOrFail();

        // Authoritative facts from Google (never the LLM).
        $this->assertSame('28.4421', (string) $society->latitude);
        $this->assertSame('77.1025', (string) $society->longitude);
        $this->assertSame('Gurugram', $society->city);
        $this->assertSame('Haryana', $society->state);
        $this->assertSame('place-magnolias', $society->place_id);

        // Neighbourhood facts carry measured distances.
        $this->assertIsArray($society->nearby_schools);
        $this->assertNotEmpty($society->nearby_schools);
        $this->assertStringContainsString('km', $society->nearby_schools[0]);

        // Deterministic scores + auditable breakdown.
        $this->assertGreaterThanOrEqual(5.5, (float) $society->score);
        $this->assertLessThanOrEqual(9.6, (float) $society->score);
        $this->assertIsArray($society->score_breakdown);
        $this->assertArrayHasKey('overall', $society->score_breakdown);
        $this->assertArrayHasKey('connectivity', $society->score_breakdown);

        // Provenance tagging.
        $this->assertSame('google_places', $society->field_sources['latitude']['source'] ?? null);

        // Multi-source image candidates, none auto-published.
        $this->assertIsArray($society->image_candidates);
        $this->assertNotEmpty($society->image_candidates);
        $sources = array_column($society->image_candidates, 'source');
        $this->assertContains('official_url', $sources);
        $this->assertFalse((bool) $society->image_approved_by_admin);

        // Always a private draft.
        $this->assertSame('Draft', $society->status);
        $this->assertFalse((bool) $society->is_published);
        $this->getJson('/api/societies')->assertOk()->assertJsonPath('data.total', 0);
    }

    public function test_admin_place_photo_proxy_returns_image_bytes(): void
    {
        Http::fake([
            'maps.googleapis.com/maps/api/place/photo*' => Http::response('binary-image-bytes', 200, ['Content-Type' => 'image/jpeg']),
        ]);

        $response = $this->withToken('admin-test-token')->get('/api/admin/import/place-photo?reference=photo-ref-1&w=640');

        $response->assertOk();
        $this->assertSame('image/jpeg', $response->headers->get('Content-Type'));
        $this->assertSame('binary-image-bytes', $response->getContent());
    }

    public function test_google_candidate_can_be_approved_as_cover_but_stays_private(): void
    {
        $society = Society::create([
            'name' => 'Google Cover Society', 'slug' => 'google-cover-society',
            'status' => 'Draft', 'verification_status' => 'Needs Review', 'is_published' => false,
            'imported_at' => now(), 'place_id' => 'place-1',
            'image_candidates' => [
                ['url' => null, 'photo_reference' => 'ref-1', 'place_id' => 'place-1', 'source' => 'google_places', 'credit' => 'Google Places', 'approved' => false, 'is_cover' => false],
            ],
        ]);

        $this->withToken('admin-test-token')
            ->postJson("/api/admin/import/societies/{$society->id}/image-candidates", ['index' => 0, 'action' => 'cover', 'rights_confirmed' => false])
            ->assertStatus(422);

        $this->withToken('admin-test-token')
            ->postJson("/api/admin/import/societies/{$society->id}/image-candidates", ['index' => 0, 'action' => 'cover', 'rights_confirmed' => true])
            ->assertOk()
            ->assertJsonPath('data.image_status', 'google_places_reference_found')
            ->assertJsonPath('data.image_photo_reference', 'ref-1')
            ->assertJsonPath('data.image_approved_by_admin', true)
            ->assertJsonPath('data.image_candidates.0.is_cover', true);

        $this->getJson('/api/societies')->assertOk()->assertJsonPath('data.total', 0);
    }

    public function test_transient_gemini_failure_still_creates_google_anchored_draft(): void
    {
        Http::fake([
            'maps.googleapis.com/maps/api/place/findplacefromtext/*' => Http::response(['status' => 'OK', 'candidates' => [['place_id' => 'place-anchor']]]),
            'maps.googleapis.com/maps/api/place/details/*' => Http::response(['status' => 'OK', 'result' => [
                'place_id' => 'place-anchor',
                'name' => 'Anchor Heights',
                'formatted_address' => 'Sector 65, Gurugram, Haryana',
                'geometry' => ['location' => ['lat' => 28.4, 'lng' => 77.05]],
                'address_components' => [
                    ['long_name' => 'Gurugram', 'types' => ['locality']],
                    ['long_name' => 'Haryana', 'types' => ['administrative_area_level_1']],
                ],
            ]]),
            'maps.googleapis.com/maps/api/place/nearbysearch/*' => Http::response(['status' => 'OK', 'results' => []]),
            'generativelanguage.googleapis.com/*' => Http::response(['error' => 'server error'], 500),
        ]);

        $this->withToken('admin-test-token')
            ->postJson('/api/admin/import/single', ['name' => 'Anchor Heights', 'location' => 'Sector 65 Gurgaon', 'include_images' => false])
            ->assertAccepted();
        $this->withToken('admin-test-token')->getJson('/api/admin/import/jobs?limit=5')->assertOk();

        $society = Society::where('name', 'Anchor Heights')->first();
        $this->assertNotNull($society, 'Draft should still be created from Google data despite a Gemini failure.');
        $this->assertSame('28.4', (string) $society->latitude);
        $this->assertSame('Gurugram', $society->city);
        $this->assertContains('ai_enrichment_pending', $society->fields_to_verify ?? []);
        $this->assertFalse((bool) $society->is_published);
    }

    public function test_grounded_timeout_falls_back_to_the_faster_non_grounded_call(): void
    {
        Http::fake(function ($request) {
            if (str_contains($request->url(), 'generativelanguage.googleapis.com')) {
                if (isset($request->data()['tools'])) {
                    throw new \Illuminate\Http\Client\ConnectionException('cURL error 28: Operation timed out');
                }

                return Http::response(['candidates' => [['content' => ['parts' => [['text' => json_encode([
                    'name' => 'Fallback Society',
                    'city' => 'Gurugram',
                    'description' => 'A complete non-grounded description produced after the grounded call timed out.',
                    'project_status' => 'Ready to Move',
                ])]]]]]]);
            }

            return Http::response([], 200);
        });

        $data = app(\App\Services\SocietyAiEnrichmentService::class)
            ->enrichSociety('Fallback Society', 'context', 'src', false, true);

        $this->assertArrayNotHasKey('_ai_error', $data);
        $this->assertSame('Fallback Society', $data['name'] ?? null);
        $this->assertSame('Ready to Move', $data['project_status'] ?? null);
    }

    public function test_imported_draft_can_be_published_from_the_review_panel(): void
    {
        $society = Society::create([
            'name' => 'Publishable Society', 'slug' => 'publishable-society',
            'status' => 'Draft', 'verification_status' => 'Needs Review', 'is_published' => false,
            'sector' => 'Sector 54', 'city' => 'Gurugram', 'score' => 8.5, 'imported_at' => now(),
        ]);

        $this->getJson('/api/societies')->assertOk()->assertJsonPath('data.total', 0);

        $this->withToken('admin-test-token')
            ->postJson("/api/admin/import/societies/{$society->id}/publish")
            ->assertOk()
            ->assertJsonPath('data.is_published', true)
            ->assertJsonPath('data.status', 'Verified');

        $this->getJson('/api/societies')->assertOk()->assertJsonPath('data.total', 1);
    }

    public function test_import_uses_non_grounded_gemini_by_default(): void
    {
        config(['services.gemini.import_grounding' => false, 'services.google_places_api_key' => null]);

        Http::fake(function ($request) {
            if (str_contains($request->url(), 'generativelanguage.googleapis.com')) {
                // Default import call must be the fast, non-grounded path.
                $this->assertArrayNotHasKey('tools', $request->data());
                $this->assertSame('application/json', $request->data()['generationConfig']['responseMimeType'] ?? null);

                return Http::response(['candidates' => [['content' => ['parts' => [['text' => json_encode([
                    'name' => 'Non Grounded Society',
                    'city' => 'Gurugram',
                    'description' => 'A reliable non-grounded description for admin review.',
                    'amenities' => ['Clubhouse', 'Gym', '24x7 Security'],
                ])]]]]]]);
            }

            return Http::response([], 200);
        });

        $this->withToken('admin-test-token')
            ->postJson('/api/admin/import/single', ['name' => 'Non Grounded Society', 'include_images' => false])
            ->assertAccepted();
        $this->withToken('admin-test-token')->getJson('/api/admin/import/jobs?limit=5')->assertOk();

        $society = Society::where('name', 'Non Grounded Society')->first();
        $this->assertNotNull($society);
        $this->assertContains('Clubhouse', $society->amenities ?? []);
    }

    public function test_publish_is_blocked_without_a_score(): void
    {
        $society = Society::create([
            'name' => 'No Score Society', 'slug' => 'no-score-society',
            'status' => 'Draft', 'is_published' => false, 'sector' => 'Sector 54', 'score' => 0,
        ]);

        $this->withToken('admin-test-token')
            ->postJson("/api/admin/import/societies/{$society->id}/publish")
            ->assertStatus(422);

        $this->assertFalse((bool) $society->fresh()->is_published);
    }
}
