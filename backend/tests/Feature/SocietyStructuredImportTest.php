<?php

namespace Tests\Feature;

use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SocietyStructuredImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.admin_api_token' => 'admin-test-token',
            'services.google_places_api_key' => 'places-test-key',
        ]);
    }

    public function test_structured_import_creates_unpublished_society_with_auto_approved_cover_image(): void
    {
        Http::fake([
            'maps.googleapis.com/maps/api/place/findplacefromtext/*' => Http::response([
                'status' => 'OK', 'candidates' => [['place_id' => 'place-golfestate']],
            ]),
            'maps.googleapis.com/maps/api/place/details/*' => Http::response([
                'status' => 'OK',
                'result' => [
                    'place_id' => 'place-golfestate',
                    'name' => 'M3M Golfestate',
                    'formatted_address' => 'Sector 65, Gurugram, Haryana 122018, India',
                    'geometry' => ['location' => ['lat' => 28.4115, 'lng' => 77.0705]],
                    'url' => 'https://maps.google.com/?cid=42',
                    'photos' => [['photo_reference' => 'ref-1'], ['photo_reference' => 'ref-2']],
                    'address_components' => [
                        ['long_name' => 'Gurugram', 'types' => ['locality']],
                        ['long_name' => 'Haryana', 'types' => ['administrative_area_level_1']],
                    ],
                ],
            ]),
        ]);

        $response = $this->withHeaders(['X-Admin-Token' => 'admin-test-token'])
            ->postJson('/api/admin/import/structured', [
                'rows' => [[
                    'name' => 'M3M Golfestate',
                    'slug' => 'm3m-golfestate-sector-65-gurgaon',
                    'builder' => 'M3M India',
                    'sector' => 'Sector 65',
                    'locality' => 'Golf Course Extension Road',
                    'city' => 'Gurugram',
                    'state' => 'Haryana',
                    'description' => 'Ultra-luxury golf-themed residential masterpiece.',
                    'project_status' => 'Ready to Move',
                    'score' => 9.6,
                    'security_score' => 9.7,
                    'amenities' => ['Clubhouse', 'Swimming Pool', '24x7 Security'],
                    'rent_range' => '₹95,000 - ₹2,500,000',
                    'buy_range' => '₹5.50 Cr - ₹16.00 Cr',
                    'status' => 'Verified',
                    'verification_status' => 'verified',
                ]],
            ]);

        $response->assertOk();
        $response->assertJsonPath('data.0.status', 'created');
        $response->assertJsonPath('data.0.place_matched', true);

        $society = Society::where('slug', 'm3m-golfestate-sector-65-gurgaon')->first();
        $this->assertNotNull($society);
        $this->assertFalse((bool) $society->is_published);
        $this->assertNotNull($society->imported_at);
        $this->assertSame('28.4115', $society->latitude);
        $this->assertSame('77.0705', $society->longitude);
        $this->assertSame('place-golfestate', $society->place_id);
        $this->assertTrue((bool) $society->image_approved_by_admin);
        $this->assertSame('google_places_reference_found', $society->image_status);
        $this->assertNotEmpty($society->image_candidates);
        $this->assertTrue((bool) $society->image_candidates[0]['approved']);
    }

    public function test_structured_import_skips_existing_slug(): void
    {
        Society::create(['slug' => 'm3m-merlin-sector-67-gurgaon', 'name' => 'M3M Merlin']);

        $response = $this->withHeaders(['X-Admin-Token' => 'admin-test-token'])
            ->postJson('/api/admin/import/structured', [
                'rows' => [[
                    'name' => 'M3M Merlin',
                    'slug' => 'm3m-merlin-sector-67-gurgaon',
                ]],
            ]);

        $response->assertOk();
        $response->assertJsonPath('data.0.status', 'skipped_duplicate');
        $this->assertSame(1, Society::count());
    }
}
