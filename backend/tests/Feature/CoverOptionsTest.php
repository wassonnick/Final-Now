<?php

namespace Tests\Feature;

use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CoverOptionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token', 'services.google_places_api_key' => 'k']);
        Http::fake(['maps.googleapis.com/maps/api/streetview/metadata*' => Http::response(['status' => 'OK'])]);
    }

    /**
     * Every source in one list. The map in particular is computed rather than stored, so
     * it is offered for any society with coordinates whether or not a harvest recorded it.
     */
    public function test_all_sources_are_offered_together(): void
    {
        $society = Society::create([
            'name' => 'DLF Magnolias',
            'slug' => 'dlf-magnolias-'.uniqid(),
            'latitude' => '28.45',
            'longitude' => '77.09',
            'image_photo_reference' => 'places/x/photos/y',
            'image_candidates' => [
                ['source' => 'google_places', 'photo_reference' => 'places/x/photos/y', 'credit' => 'Google Places'],
                ['source' => 'official_url', 'url' => 'https://dlf.com/hero.jpg', 'credit' => 'www.dlf.in'],
            ],
        ]);

        $response = $this->withToken('admin-test-token')
            ->getJson("/api/admin/societies/{$society->id}/cover-options")
            ->assertOk();

        $sources = array_column($response->json('options'), 'source');
        $this->assertContains('google_places', $sources);
        $this->assertContains('official_url', $sources);
        $this->assertContains('google_street_view', $sources);
        $this->assertContains('location_map', $sources);

        // The one already in use is marked, so the operator is not guessing.
        $current = collect($response->json('options'))->firstWhere('source', 'google_places');
        $this->assertTrue($current['is_current']);
    }

    /** Rights are a property of the source, and the UI needs to know before it publishes. */
    public function test_only_developer_images_are_flagged_as_needing_a_rights_check(): void
    {
        $society = Society::create([
            'name' => 'DLF Magnolias',
            'slug' => 'dlf-'.uniqid(),
            'latitude' => '28.45',
            'longitude' => '77.09',
            'image_candidates' => [
                ['source' => 'google_places', 'photo_reference' => 'ref-1'],
                ['source' => 'official_url', 'url' => 'https://dlf.com/a.jpg'],
            ],
        ]);

        $options = collect($this->withToken('admin-test-token')
            ->getJson("/api/admin/societies/{$society->id}/cover-options")->json('options'));

        $this->assertFalse($options->firstWhere('source', 'google_places')['requires_rights']);
        $this->assertTrue($options->firstWhere('source', 'official_url')['requires_rights']);
        $this->assertFalse($options->firstWhere('source', 'location_map')['requires_rights']);
    }

    /** No coordinates means no map and no Street View — say so rather than offering both. */
    public function test_a_society_without_coordinates_gets_no_computed_options(): void
    {
        $society = Society::create(['name' => 'Nowhere', 'slug' => 'nowhere-'.uniqid()]);

        $response = $this->withToken('admin-test-token')
            ->getJson("/api/admin/societies/{$society->id}/cover-options")->assertOk();

        $this->assertFalse($response->json('has_coordinates'));
        $this->assertSame([], $response->json('options'));
    }
}
