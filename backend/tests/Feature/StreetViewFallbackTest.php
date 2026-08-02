<?php

namespace Tests\Feature;

use App\Models\Society;
use App\Services\Society\Import\SocietyImageHarvestService;
use App\Services\Society\Import\SocietyImageReharvestService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class StreetViewFallbackTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.admin_api_token' => 'admin-test-token',
            'services.google_places_api_key' => 'places-test-key',
            'services.claude.image_screen_enabled' => false,
        ]);
    }

    /** Metadata lists imagery and the image endpoint serves it — the healthy case. */
    private function fakeStreetView(): void
    {
        Http::fake([
            'maps.googleapis.com/maps/api/streetview/metadata*' => Http::response(['status' => 'OK']),
            'maps.googleapis.com/maps/api/streetview*' => Http::response('jpeg-bytes', 200, ['Content-Type' => 'image/jpeg']),
        ]);
    }

    /**
     * Metadata says imagery exists and the image endpoint refuses to serve it. Conscient
     * Heritage Max was exactly this: it passed the free check, published a Street View
     * cover, and then 404'd on the live page. Verifying metadata is not verifying an image.
     */
    public function test_a_location_whose_image_will_not_serve_is_not_published(): void
    {
        Http::fake([
            'maps.googleapis.com/maps/api/streetview/metadata*' => Http::response(['status' => 'OK']),
            'maps.googleapis.com/maps/api/streetview*' => Http::response('no imagery here', 404),
        ]);

        $this->assertSame([], app(SocietyImageHarvestService::class)->harvest($this->ctx()));
    }

    private function ctx(array $overrides = []): array
    {
        return array_merge([
            'name' => 'Ireo Gurgaon Hills',
            'builder' => 'Ireo',
            'latitude' => 28.4,
            'longitude' => 77.09,
            'project_status' => 'Ready to Move',
        ], $overrides);
    }

    /** The gap this exists for: Google matched the society but holds no photograph. */
    public function test_street_view_fills_in_when_places_has_no_photo(): void
    {
        $this->fakeStreetView();

        $candidates = app(SocietyImageHarvestService::class)->harvest($this->ctx());

        $this->assertCount(1, $candidates);
        $this->assertSame('google_street_view', $candidates[0]['source']);
        $this->assertSame('streetview:28.4,77.09', $candidates[0]['photo_reference']);
        $this->assertFalse($candidates[0]['approved']);
    }

    /** It must never displace an actual photograph of the place. */
    public function test_street_view_is_not_added_when_places_has_photos(): void
    {
        $this->fakeStreetView();

        $candidates = app(SocietyImageHarvestService::class)->harvest($this->ctx([
            'photo_references' => ['real-photo'],
            'photo_meta' => ['real-photo' => ['width' => 1600, 'height' => 1000]],
            'place_id' => 'p1',
        ]));

        $this->assertSame(['google_places'], array_values(array_unique(array_column($candidates, 'source'))));
    }

    /** A project still being built has no building to photograph from the road. */
    public function test_under_construction_projects_are_skipped(): void
    {
        $this->fakeStreetView();

        foreach (['Under Construction', 'New Launch', 'Pre-Launch', 'Upcoming'] as $status) {
            $this->assertSame([], app(SocietyImageHarvestService::class)->harvest(
                $this->ctx(['project_status' => $status]),
            ), $status.' should be skipped.');
        }
    }

    /**
     * project_status is free text. Accepting only the word "ready" silently skipped every
     * society marked Delivered or Needs Review — most of the ones this fallback exists
     * for. A built society must qualify however its status happens to be worded.
     */
    public function test_built_societies_qualify_whatever_the_status_wording(): void
    {
        $this->fakeStreetView();

        foreach (['Delivered', 'Completed', 'Ready to Move', 'Needs Review', ''] as $status) {
            $candidates = app(SocietyImageHarvestService::class)->harvest($this->ctx(['project_status' => $status]));

            $this->assertCount(1, $candidates, 'Status "'.$status.'" should still get Street View.');
            $this->assertSame('google_street_view', $candidates[0]['source']);
        }
    }

    /** No coverage at the point means no candidate, and the free check says so first. */
    public function test_no_coverage_means_no_candidate(): void
    {
        Http::fake(['maps.googleapis.com/maps/api/streetview/metadata*' => Http::response(['status' => 'ZERO_RESULTS'])]);

        $this->assertSame([], app(SocietyImageHarvestService::class)->harvest($this->ctx()));
    }

    /** End to end: it becomes a cover, with a status that records what it actually is. */
    public function test_a_street_view_cover_is_published_and_labelled_honestly(): void
    {
        $society = Society::create([
            'name' => 'Ireo Gurgaon Hills',
            'slug' => 'ireo-gurgaon-hills-'.uniqid(),
            'builder' => 'Ireo',
            'sector' => 'Sector 60',
            'city' => 'Gurugram',
            'latitude' => '28.4',
            'longitude' => '77.09',
            'project_status' => 'Ready to Move',
            'status' => 'Verified',
            'is_published' => true,
            'image_approved_by_admin' => false,
        ]);

        Http::fake([
            // Most specific first: metadata must not be answered by the image stub.
            'maps.googleapis.com/maps/api/streetview/metadata*' => Http::response(['status' => 'OK']),
            'maps.googleapis.com/maps/api/streetview*' => Http::response('jpeg', 200, ['Content-Type' => 'image/jpeg']),
            'maps.googleapis.com/maps/api/place/findplacefromtext/*' => Http::response(['status' => 'OK', 'candidates' => [['place_id' => 'p2']]]),
            'maps.googleapis.com/maps/api/place/details/*' => Http::response(['status' => 'OK', 'result' => [
                'place_id' => 'p2',
                'name' => 'Ireo Gurgaon Hills',
                'geometry' => ['location' => ['lat' => 28.4, 'lng' => 77.09]],
                'photos' => [],
            ]]),
        ]);

        $result = app(SocietyImageReharvestService::class)->reharvest($society);

        $this->assertTrue($result['republished']);
        $this->assertStringContainsString('Street View', $result['note']);

        $society->refresh();
        // The status says which source it came from; "google_places" here would be a lie.
        $this->assertSame('google_street_view_reference_found', $society->image_status);
        $this->assertSame('streetview:28.4,77.09', $society->image_photo_reference);
        $this->assertTrue((bool) $society->image_approved_by_admin);
    }

    /** The public proxy serves it without a place_id, which these societies may not have. */
    public function test_the_public_proxy_serves_a_street_view_cover(): void
    {
        $society = Society::create([
            'name' => 'Ireo Gurgaon Hills',
            'slug' => 'ireo-sv-'.uniqid(),
            'status' => 'Verified',
            'is_published' => true,
            'image_approved_by_admin' => true,
            'image_status' => 'google_street_view_reference_found',
            'image_photo_reference' => 'streetview:28.4,77.09',
            'place_id' => null,
        ]);

        Http::fake(['maps.googleapis.com/maps/api/streetview*' => Http::response('jpeg', 200, ['Content-Type' => 'image/jpeg'])]);

        $this->get("/api/societies/{$society->slug}/google-place-photo?w=800")
            ->assertOk()
            ->assertHeader('Content-Type', 'image/jpeg');
    }
}
