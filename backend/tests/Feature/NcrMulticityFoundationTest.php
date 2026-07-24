<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Region;
use App\Models\Society;
use App\Models\VerifiedSocietyImportJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NcrMulticityFoundationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.admin_api_token' => 'ncr-admin-token',
            'features.ncr_multicity' => false,
        ]);
    }

    public function test_ncr_multicity_feature_flag_defaults_to_review_off(): void
    {
        $this->assertFalse((bool) config('features.ncr_multicity'));
    }

    public function test_admin_location_catalog_is_protected_and_lists_seeded_ncr_cities(): void
    {
        $this->getJson('/api/admin/locations')->assertUnauthorized();

        $this->withToken('ncr-admin-token')
            ->getJson('/api/admin/locations')
            ->assertOk()
            ->assertJsonPath('enabled', false)
            ->assertJsonFragment(['name' => 'Gurugram', 'slug' => 'gurgaon'])
            ->assertJsonFragment(['name' => 'Delhi', 'slug' => 'delhi'])
            ->assertJsonFragment(['name' => 'Noida', 'slug' => 'noida'])
            ->assertJsonFragment(['name' => 'Greater Noida', 'slug' => 'greater-noida'])
            ->assertJsonFragment(['name' => 'Faridabad', 'slug' => 'faridabad']);
    }

    public function test_public_society_city_filters_are_additive_and_do_not_include_drafts(): void
    {
        $gurgaon = City::where('slug', 'gurgaon')->firstOrFail();
        $noida = City::where('slug', 'noida')->firstOrFail();

        $publishedNoida = Society::create([
            'name' => 'Noida Public Society',
            'slug' => 'noida-public-society',
            'city' => 'Noida',
            'city_id' => $noida->id,
            'status' => 'Verified',
            'verification_status' => 'Verified',
            'is_published' => true,
            'score' => 8,
        ]);

        Society::create([
            'name' => 'Gurgaon Public Society',
            'slug' => 'gurgaon-public-society',
            'city' => 'Gurugram',
            'city_id' => $gurgaon->id,
            'status' => 'Verified',
            'verification_status' => 'Verified',
            'is_published' => true,
            'score' => 8,
        ]);

        Society::create([
            'name' => 'Noida Draft Society',
            'slug' => 'noida-draft-society',
            'city' => 'Noida',
            'city_id' => $noida->id,
            'status' => 'Draft',
            'verification_status' => 'Needs Review',
            'is_published' => false,
            'score' => 8,
        ]);

        $response = $this->getJson('/api/societies?city_id='.$noida->id);

        $response->assertOk()
            ->assertJsonPath('data.data.0.id', $publishedNoida->id)
            ->assertJsonCount(1, 'data.data');
    }

    public function test_verified_importer_can_preserve_target_city_context_without_publishing(): void
    {
        $region = Region::where('slug', 'delhi-ncr')->firstOrFail();
        $noida = City::where('slug', 'noida')->firstOrFail();

        $this->withToken('ncr-admin-token')
            ->postJson('/api/admin/verified-importer/single', [
                'name' => 'NCR Noida Draft Society',
                'sector' => 'Sector 150',
                'builder_name' => 'NCR Builder',
                'target_region_id' => $region->id,
                'target_city_id' => $noida->id,
                'target_city' => 'Noida',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'needs_review');

        $society = Society::where('slug', 'ncr-noida-draft-society-sector-150-noida')->firstOrFail();
        $this->assertSame($region->id, $society->region_id);
        $this->assertSame($noida->id, $society->city_id);
        $this->assertSame('Noida', $society->city);
        $this->assertFalse($society->is_published);
        $this->assertSame('Draft', $society->status);

        $job = VerifiedSocietyImportJob::latest()->firstOrFail();
        $this->assertSame($region->id, $job->target_region_id);
        $this->assertSame($noida->id, $job->target_city_id);
        $this->assertSame('Noida', $job->target_city);
    }
}
