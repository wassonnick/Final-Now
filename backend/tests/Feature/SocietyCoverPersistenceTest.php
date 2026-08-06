<?php

namespace Tests\Feature;

use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SocietyCoverPersistenceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
    }

    /**
     * Every Google-served cover is identified by image_photo_reference alone. The field
     * was missing from the update validator, and $request->validate() returns only the
     * keys it validated — so the value arrived, was silently dropped, and the society
     * kept whatever cover it already had. No amount of picking could change it.
     */
    public function test_the_cover_reference_survives_a_save(): void
    {
        $society = Society::create([
            'name' => 'DLF Magnolias',
            'slug' => 'dlf-'.uniqid(),
            'image_photo_reference' => 'places/old/photos/old',
            'image_status' => 'google_places_reference_found',
        ]);

        $this->withToken('admin-test-token')
            ->putJson("/api/admin/societies/{$society->id}", [
                'name' => 'DLF Magnolias',
                'image_photo_reference' => 'staticmap:28.45,77.09',
                'image_status' => 'location_map_reference_found',
                'image_approved_by_admin' => true,
            ])
            ->assertSuccessful();

        $society->refresh();
        $this->assertSame('staticmap:28.45,77.09', $society->image_photo_reference);
        $this->assertSame('location_map_reference_found', $society->image_status);
    }

    /**
     * Gallery membership for a Google-served image is the `approved` flag on its
     * candidate, since it has no URL to store. The candidate list was read from the API
     * and never sent back, so approving one into the gallery — or removing one — changed
     * the form and nothing else.
     */
    public function test_candidate_gallery_flags_survive_a_save(): void
    {
        $society = Society::create([
            'name' => 'DLF Magnolias',
            'slug' => 'dlf-'.uniqid(),
            'image_candidates' => [
                ['source' => 'google_places', 'photo_reference' => 'ref-a', 'approved' => false],
            ],
        ]);

        $this->withToken('admin-test-token')
            ->putJson("/api/admin/societies/{$society->id}", [
                'name' => 'DLF Magnolias',
                'image_candidates' => [
                    ['source' => 'google_places', 'photo_reference' => 'ref-a', 'approved' => true],
                    ['source' => 'location_map', 'photo_reference' => 'staticmap:28.4,77.0', 'approved' => true],
                ],
            ])
            ->assertSuccessful();

        $candidates = $society->fresh()->image_candidates;
        $this->assertCount(2, $candidates);
        $this->assertTrue($candidates[0]['approved']);
        $this->assertSame('staticmap:28.4,77.0', $candidates[1]['photo_reference']);
    }

    /** Clearing it must work too — an uploaded cover supersedes a Google reference. */
    public function test_the_cover_reference_can_be_cleared(): void
    {
        $society = Society::create([
            'name' => 'DLF Magnolias',
            'slug' => 'dlf-'.uniqid(),
            'image_photo_reference' => 'places/x/photos/y',
        ]);

        $this->withToken('admin-test-token')
            ->putJson("/api/admin/societies/{$society->id}", [
                'name' => 'DLF Magnolias',
                'image_photo_reference' => '',
                'cover_image' => 'https://cdn.test/own.jpg',
            ])
            ->assertSuccessful();

        $this->assertSame('', (string) $society->fresh()->image_photo_reference);
    }
}
