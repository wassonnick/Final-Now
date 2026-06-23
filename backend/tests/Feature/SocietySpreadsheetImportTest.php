<?php

namespace Tests\Feature;

use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SocietySpreadsheetImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token', 'services.gemini.api_key' => null]);
    }

    public function test_admin_can_upload_excel_template_and_only_create_unpublished_draft(): void
    {
        $path = base_path('../frontend/public/templates/societyflats-gemini-import-template.xlsx');
        $file = new UploadedFile($path, 'societies.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);

        $response = $this->withToken('admin-test-token')->post('/api/admin/import/spreadsheet', ['file' => $file], ['Accept' => 'application/json']);
        $response->assertAccepted()->assertJsonPath('data.type', 'bulk_spreadsheet')->assertJsonPath('data.results.0.name', 'DLF The Ultima')->assertJsonPath('data.results.0.city', 'Gurugram');
        $this->withToken('admin-test-token')->getJson('/api/admin/import/jobs?limit=10')->assertOk();

        $this->assertDatabaseHas('societies', ['name' => 'DLF The Ultima', 'city' => 'Gurugram', 'builder' => 'DLF Limited', 'status' => 'Draft', 'verification_status' => 'Needs Review', 'is_published' => false]);
        $this->getJson('/api/societies')->assertOk()->assertJsonPath('data.total', 0);
    }

    public function test_csv_requires_society_name_and_city_headers(): void
    {
        $file = UploadedFile::fake()->createWithContent('bad.csv', "name,builder\nExample Society,Builder");
        $this->withToken('admin-test-token')->post('/api/admin/import/spreadsheet', ['file' => $file], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('file');
    }

    public function test_csv_upload_preserves_authoritative_identity_fields(): void
    {
        $csv = "society_name,city,sector,locality,builder,google_maps_url\nExample Heights,Delhi,Sector 9,Central District,Example Builder,https://maps.google.com/example\n";
        $file = UploadedFile::fake()->createWithContent('societies.csv', $csv);
        $this->withToken('admin-test-token')->post('/api/admin/import/spreadsheet', ['file' => $file], ['Accept' => 'application/json'])->assertAccepted();
        $this->withToken('admin-test-token')->getJson('/api/admin/import/jobs?limit=10')->assertOk();
        $this->assertDatabaseHas('societies', ['name' => 'Example Heights', 'city' => 'Delhi', 'sector' => 'Sector 9', 'locality' => 'Central District', 'builder' => 'Example Builder', 'google_maps_url' => 'https://maps.google.com/example', 'is_published' => false]);
    }

    public function test_gemini_image_candidate_stays_private_until_admin_confirms_rights(): void
    {
        config(['services.gemini.api_key' => 'test-key', 'services.gemini.model' => 'test-model', 'services.google_places_api_key' => null]);
        Http::fake(function ($request) {
            $payload = $request->data();
            $this->assertArrayHasKey('google_search', $payload['tools'][0]);
            $this->assertArrayNotHasKey('responseMimeType', $payload['generationConfig']);

            return Http::response(['candidates' => [['content' => ['parts' => [['text' => ''], ['text' => json_encode(['name' => 'Image Heights', 'city' => 'Gurugram', 'description' => 'A sufficiently detailed grounded society description for admin review.', 'project_status' => 'Under Construction', 'possession_date' => 'Dec 2028', 'project_area' => '20 acres', 'configuration' => '3 and 4 BHK', 'total_towers' => '12', 'total_units' => '800', 'rent_range' => '₹50,000 - ₹80,000', 'buy_range' => '₹3 Cr - ₹5 Cr', 'nearby_schools' => ['Example School - 2 km'], 'nearby_hospitals' => ['Example Hospital - 3 km'], 'nearby_metro' => ['Example Metro - 5 km'], 'nearby_office_hubs' => ['Cyber City - 20 km'], 'official_project_url' => 'https://developer.example.com/image-heights', 'official_developer_url' => 'https://developer.example.com', 'image_url' => 'https://developer.example.com/image-heights.jpg', 'image_status' => 'needs_review', 'image_credit' => 'Official developer', 'source_confidence_score' => 75, 'fields_to_verify' => ['image_rights']])]]]]]]);
        });
        $csv = "society_name,city,builder\nImage Heights,Gurugram,Example Builder\n";
        $file = UploadedFile::fake()->createWithContent('images.csv', $csv);
        $this->withToken('admin-test-token')->post('/api/admin/import/spreadsheet', ['file' => $file, 'include_images' => '1'], ['Accept' => 'application/json'])->assertAccepted();
        $this->withToken('admin-test-token')->getJson('/api/admin/import/jobs?limit=10')->assertOk();
        $society = Society::where('name', 'Image Heights')->firstOrFail();
        $this->assertFalse((bool) $society->image_approved_by_admin);
        $this->assertSame('needs_review', $society->image_status);
        $this->assertSame('Under Construction', $society->project_status);
        $this->assertSame('Dec 2028', $society->possession_date);
        $this->assertSame('20 acres', $society->project_area);
        $this->assertSame(['Example School - 2 km'], $society->nearby_schools);
        $this->assertSame('https://developer.example.com/image-heights', $society->official_project_url);
        $this->withToken('admin-test-token')->patchJson("/api/admin/import/societies/{$society->id}/image", ['decision' => 'approve', 'rights_confirmed' => false])->assertUnprocessable();
        $this->withToken('admin-test-token')->patchJson("/api/admin/import/societies/{$society->id}/image", ['decision' => 'approve', 'rights_confirmed' => true])->assertOk()->assertJsonPath('data.image_status', 'approved_for_live')->assertJsonPath('data.image_approved_by_admin', true);
        $this->getJson('/api/societies')->assertOk()->assertJsonPath('data.total', 0);
    }

    public function test_published_society_exposes_project_status_and_possession_date(): void
    {
        Society::create([
            'name' => 'Possession Heights',
            'slug' => 'possession-heights',
            'city' => 'Gurugram',
            'status' => 'Verified',
            'verification_status' => 'Verified',
            'is_published' => true,
            'project_status' => 'Under Construction',
            'possession_date' => 'Q4 2027',
            'description' => 'Published society with clear delivery timeline.',
        ]);

        $this->getJson('/api/societies/possession-heights')
            ->assertOk()
            ->assertJsonPath('data.project_status', 'Under Construction')
            ->assertJsonPath('data.possession_date', 'Q4 2027');
    }

    public function test_sparse_unpublished_draft_can_be_re_enriched_without_becoming_public(): void
    {
        config(['services.gemini.api_key' => 'test-key', 'services.gemini.model' => 'test-model']);
        $society = Society::create(['name' => 'Sparse Society', 'slug' => 'sparse-society', 'builder' => 'Known Builder', 'city' => 'Gurugram', 'status' => 'Draft', 'verification_status' => 'Needs Review', 'is_published' => false, 'description' => 'Basic draft']);
        Http::fake(fn () => Http::response(['candidates' => [['content' => ['parts' => [['text' => json_encode(['name' => 'Sparse Society', 'description' => 'A complete grounded description with project and location intelligence.', 'sector' => 'Sector 70', 'project_area' => '10 acres', 'total_towers' => '8', 'total_units' => '500', 'rent_range' => '₹40,000 - ₹60,000', 'buy_range' => '₹2 Cr - ₹3 Cr', 'nearby_schools' => ['School A'], 'nearby_metro' => ['Metro A'], 'nearby_hospitals' => ['Hospital A'], 'nearby_office_hubs' => ['Office A'], 'official_project_url' => 'https://builder.example.com/project', 'meta_title' => 'Sparse Society Gurgaon', 'meta_description' => 'Grounded project profile.', 'source_confidence_score' => 90])]]]]]]));
        $this->withToken('admin-test-token')->postJson("/api/admin/import/societies/{$society->id}/re-enrich", ['include_images' => false])->assertOk()->assertJsonPath('data.project_area', '10 acres')->assertJsonPath('data.status', 'Draft')->assertJsonPath('data.is_published', false)->assertJsonPath('data.builder', 'Known Builder');
        $this->assertNotNull($society->fresh()->imported_at);
    }

    public function test_google_places_photo_requires_explicit_admin_display_approval(): void
    {
        $society = Society::create(['name' => 'Google Image Society', 'slug' => 'google-image-society', 'status' => 'Verified', 'verification_status' => 'Verified', 'is_published' => true, 'imported_at' => now(), 'place_id' => 'place-123', 'image_reference_url' => 'https://maps.google.com/example', 'image_status' => 'google_places_reference_found', 'image_credit' => 'Google Places', 'image_approved_by_admin' => false]);
        $this->getJson('/api/societies/google-image-society/google-place-photo')->assertNotFound();
        $this->withToken('admin-test-token')->patchJson("/api/admin/import/societies/{$society->id}/image", ['decision' => 'approve', 'rights_confirmed' => true])->assertOk()->assertJsonPath('data.image_status', 'google_places_reference_found')->assertJsonPath('data.image_approved_by_admin', true);
    }

    public function test_google_places_reference_can_fill_draft_coordinates_and_map_url(): void
    {
        config(['services.google_places_api_key' => 'google-test-key']);
        Http::fake([
            'maps.googleapis.com/maps/api/place/findplacefromtext/json*' => Http::response([
                'status' => 'OK',
                'candidates' => [
                    ['place_id' => 'place-draft-123'],
                ],
            ]),
            'maps.googleapis.com/maps/api/place/details/json*' => Http::response([
                'status' => 'OK',
                'result' => [
                    'place_id' => 'place-draft-123',
                    'name' => 'Draft Google Society',
                    'formatted_address' => 'Sector 70, Gurugram, Haryana',
                    'url' => 'https://maps.google.com/?cid=123',
                    'geometry' => ['location' => ['lat' => 28.39, 'lng' => 77.02]],
                    'photos' => [
                        ['photo_reference' => 'photo-reference-123'],
                    ],
                ],
            ]),
        ]);

        $society = Society::create(['name' => 'Draft Google Society', 'slug' => 'draft-google-society', 'status' => 'Draft', 'verification_status' => 'Needs Review', 'is_published' => false, 'city' => 'Gurugram']);

        $this->withToken('admin-test-token')
            ->postJson("/api/admin/societies/{$society->id}/google-places-image-reference")
            ->assertOk()
            ->assertJsonPath('data.status', 'Draft')
            ->assertJsonPath('data.is_published', false)
            ->assertJsonPath('data.place_id', 'place-draft-123')
            ->assertJsonPath('data.google_maps_url', 'https://maps.google.com/?cid=123')
            ->assertJsonPath('data.latitude', '28.39')
            ->assertJsonPath('data.longitude', '77.02')
            ->assertJsonPath('data.image_status', 'google_places_reference_found')
            ->assertJsonPath('data.image_approved_by_admin', false);
    }

    public function test_bulk_nearby_autofill_accepts_existing_array_cast_fields(): void
    {
        config(['services.google_places_api_key' => 'google-test-key']);
        Http::fake([
            'maps.googleapis.com/maps/api/place/nearbysearch/json*' => Http::response([
                'status' => 'OK',
                'results' => [
                    ['name' => 'Nearby Place', 'vicinity' => 'Sector 70', 'rating' => 4.2],
                ],
            ]),
        ]);

        $society = Society::create([
            'name' => 'Nearby Draft Society',
            'slug' => 'nearby-draft-society',
            'status' => 'Draft',
            'verification_status' => 'Needs Review',
            'is_published' => false,
            'latitude' => '28.39',
            'longitude' => '77.02',
            'nearby_schools' => [],
            'nearby_metro' => [],
            'nearby_hospitals' => [],
            'nearby_office_hubs' => [],
        ]);

        $this->withToken('admin-test-token')
            ->postJson('/api/admin/societies/nearby-intelligence/bulk-auto-fill', ['society_ids' => [$society->id]])
            ->assertOk()
            ->assertJsonPath('summary.updated', 1)
            ->assertJsonPath('summary.failed', 0);

        $fresh = $society->fresh();
        $this->assertIsArray($fresh->nearby_schools);
        $this->assertNotEmpty($fresh->nearby_schools);
    }

    public function test_empty_grounded_response_retries_once_without_grounding(): void
    {
        config(['services.gemini.api_key' => 'test-key', 'services.gemini.model' => 'test-model', 'services.google_places_api_key' => null]);
        Http::fakeSequence()
            ->push(['candidates' => [['finishReason' => 'STOP', 'content' => ['parts' => []]]]])
            ->push(['candidates' => [['content' => ['parts' => [['text' => json_encode(['name' => 'Fallback Heights', 'city' => 'Gurugram', 'description' => 'Review-safe fallback profile.', 'fields_to_verify' => ['market_ranges', 'distances', 'image_rights']])]]]]]]);
        $file = UploadedFile::fake()->createWithContent('fallback.csv', "society_name,city\nFallback Heights,Gurugram\n");
        $this->withToken('admin-test-token')->post('/api/admin/import/spreadsheet', ['file' => $file, 'include_images' => '1'], ['Accept' => 'application/json'])->assertAccepted();
        $this->withToken('admin-test-token')->getJson('/api/admin/import/jobs?limit=10')->assertOk();
        Http::assertSentCount(2);
        $this->assertDatabaseHas('societies', ['name' => 'Fallback Heights', 'status' => 'Draft', 'is_published' => false]);
    }
}
