<?php

namespace Tests\Feature;

use App\Models\Society;
use App\Services\Society\Import\SocietyImageReharvestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CuratedCoverGuardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.google_places_api_key' => 'k', 'services.claude.image_screen_enabled' => false]);

        Http::fake([
            'maps.googleapis.com/maps/api/place/findplacefromtext/*' => Http::response(['status' => 'OK', 'candidates' => [['place_id' => 'p1']]]),
            'maps.googleapis.com/maps/api/place/details/*' => Http::response(['status' => 'OK', 'result' => [
                'place_id' => 'p1',
                'name' => 'DLF Princeton Estate',
                'geometry' => ['location' => ['lat' => 28.44, 'lng' => 77.10]],
                'photos' => [['photo_reference' => 'a-fresh-google-photo', 'width' => 1600, 'height' => 1000]],
            ]]),
            'maps.googleapis.com/maps/api/streetview*' => Http::response('jpeg', 200, ['Content-Type' => 'image/jpeg']),
            'maps.googleapis.com/maps/api/staticmap*' => Http::response('png', 200, ['Content-Type' => 'image/png']),
        ]);
    }

    private function society(array $overrides = []): Society
    {
        return Society::create(array_merge([
            'name' => 'DLF Princeton Estate',
            'slug' => 'dlf-'.uniqid(),
            'sector' => 'Sector 53',
            'city' => 'Gurugram',
            'latitude' => '28.44',
            'longitude' => '77.10',
            'image_approved_by_admin' => true,
        ], $overrides));
    }

    /**
     * The loss this prevents: a bulk re-harvest finding any Places photo and overwriting
     * a cover someone uploaded — the most expensive work in the system, destroyed across
     * the whole catalogue in one click.
     */
    public function test_an_uploaded_cover_is_never_replaced_by_automation(): void
    {
        $society = $this->society([
            'image_status' => 'licensed_uploaded',
            'cover_image' => 'https://pub-test.r2.dev/societies/mine.jpg',
            'image_photo_reference' => null,
        ]);

        $result = app(SocietyImageReharvestService::class)->reharvest($society);

        $society->refresh();
        $this->assertSame('licensed_uploaded', $society->image_status);
        $this->assertSame('https://pub-test.r2.dev/societies/mine.jpg', $society->cover_image);
        $this->assertNull($society->image_photo_reference);
        $this->assertFalse($result['republished']);
        $this->assertStringContainsString('chosen by an admin', $result['note']);
    }

    /** An automatic cover carries no human decision, so it may be improved on freely. */
    public function test_a_map_cover_is_still_replaced_by_a_real_photo(): void
    {
        $society = $this->society([
            'image_status' => 'location_map_reference_found',
            'image_photo_reference' => 'staticmap:28.44,77.1',
        ]);

        $result = app(SocietyImageReharvestService::class)->reharvest($society);

        $this->assertTrue($result['republished']);
        $this->assertSame('a-fresh-google-photo', $society->fresh()->image_photo_reference);
    }
}
