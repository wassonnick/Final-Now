<?php

namespace Tests\Feature;

use App\Models\City;
use App\Models\Lead;
use App\Models\Locality;
use App\Models\NcrCityLaunchApproval;
use App\Models\Property;
use App\Models\SeoPage;
use App\Models\Region;
use App\Models\Society;
use App\Models\VerifiedSocietyImportJob;
use App\Models\Zone;
use App\Services\Seo\LiveSitemapService;
use App\Services\Seo\SeoPageRegistryService;
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
            'features.ncr_city_indexing' => false,
            'features.ncr_indexable_city_slugs' => [],
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

    public function test_admin_location_audit_reports_mapping_gaps_without_private_lead_data(): void
    {
        $this->getJson('/api/admin/locations/audit')->assertUnauthorized();

        Society::create([
            'name' => 'Unmapped Public Gurgaon Society',
            'slug' => 'unmapped-public-gurgaon-society',
            'city' => 'Gurugram',
            'status' => 'Verified',
            'verification_status' => 'Verified',
            'is_published' => true,
            'score' => 8,
        ]);

        Property::create([
            'title' => 'Unmapped Gurgaon Home',
            'slug' => 'unmapped-gurgaon-home',
            'city' => 'Gurugram',
            'status' => 'Live',
        ]);

        Lead::create([
            'name' => 'Private Lead Name',
            'phone' => '9999999999',
            'target_city' => 'Noida',
        ]);

        $response = $this->withToken('ncr-admin-token')
            ->getJson('/api/admin/locations/audit')
            ->assertOk()
            ->assertJsonPath('data.societies.public_missing_city_id', 1)
            ->assertJsonPath('data.properties.public_missing_city_id', 1)
            ->assertJsonPath('data.leads.has_target_city_without_city_id', 1)
            ->assertJsonPath('data.recommendation.ready_for_public_city_filters', false);

        $json = json_encode($response->json());
        $this->assertStringNotContainsString('Private Lead Name', $json);
        $this->assertStringNotContainsString('9999999999', $json);
    }

    public function test_admin_location_audit_includes_conservative_city_readiness(): void
    {
        config(['features.ncr_multicity' => true]);

        $region = Region::where('slug', 'delhi-ncr')->firstOrFail();
        $noida = City::where('slug', 'noida')->firstOrFail();

        Society::create([
            'name' => 'Noida Readiness Society',
            'slug' => 'noida-readiness-society',
            'region_id' => $region->id,
            'city_id' => $noida->id,
            'city' => 'Noida',
            'status' => 'Verified',
            'verification_status' => 'Verified',
            'is_published' => true,
            'score' => 8,
        ]);

        Locality::create([
            'region_id' => $region->id,
            'city_id' => $noida->id,
            'name' => 'Sector 150',
            'slug' => 'sector-150',
            'city' => 'Noida',
            'state' => 'Uttar Pradesh',
            'published_status' => 'review',
        ]);

        Lead::create([
            'name' => 'Sensitive Lead',
            'phone' => '9888888888',
            'target_city' => 'Noida',
        ]);

        $response = $this->withToken('ncr-admin-token')
            ->getJson('/api/admin/locations/audit')
            ->assertOk()
            ->assertJsonPath('data.city_readiness.2.slug', 'noida')
            ->assertJsonPath('data.city_readiness.2.public_societies_count', 1)
            ->assertJsonPath('data.city_readiness.2.localities_count', 1)
            ->assertJsonPath('data.city_readiness.2.indexing_approved', false)
            ->assertJsonPath('data.city_readiness.2.ready_for_public_rollout', false)
            ->assertJsonPath('data.city_readiness.2.recommended_status', 'needs_verified_societies');

        $json = json_encode($response->json('data.city_readiness'));
        $this->assertStringNotContainsString('Sensitive Lead', $json);
        $this->assertStringNotContainsString('9888888888', $json);
    }

    public function test_ncr_city_backfill_preview_and_apply_are_explicit_and_exact(): void
    {
        config(['features.ncr_multicity' => true]);

        $this->getJson('/api/admin/locations/backfill/preview')->assertUnauthorized();
        $this->postJson('/api/admin/locations/backfill/apply')->assertUnauthorized();

        $region = Region::where('slug', 'delhi-ncr')->firstOrFail();
        $noida = City::where('slug', 'noida')->firstOrFail();
        $faridabad = City::where('slug', 'faridabad')->firstOrFail();

        $society = Society::create([
            'name' => 'Loose Noida Public Society',
            'slug' => 'loose-noida-public-society',
            'city' => 'Noida',
            'status' => 'Verified',
            'verification_status' => 'Verified',
            'is_published' => true,
            'score' => 8,
        ]);

        $property = Property::create([
            'title' => 'Loose Faridabad Home',
            'slug' => 'loose-faridabad-home',
            'city' => 'Faridabad',
            'status' => 'Live',
        ]);

        $lead = Lead::create([
            'name' => 'Private Backfill Lead',
            'phone' => '9777777777',
            'target_city' => 'Noida',
        ]);

        $job = VerifiedSocietyImportJob::create([
            'job_type' => 'single',
            'status' => 'needs_review',
            'total_rows' => 1,
            'target_city' => 'Faridabad',
        ]);

        $this->withToken('ncr-admin-token')
            ->getJson('/api/admin/locations/backfill/preview')
            ->assertOk()
            ->assertJsonPath('mode', 'preview')
            ->assertJsonPath('data.applied', false)
            ->assertJsonPath('data.summary.societies', 1)
            ->assertJsonPath('data.summary.properties', 1)
            ->assertJsonPath('data.summary.leads', 1)
            ->assertJsonPath('data.summary.verified_import_jobs', 1)
            ->assertJsonPath('data.summary.total', 4);

        $this->withToken('ncr-admin-token')
            ->postJson('/api/admin/locations/backfill/apply', ['confirmation' => 'WRONG'])
            ->assertStatus(422);

        $this->assertNull($society->fresh()->city_id);
        $this->assertNull($property->fresh()->city_id);
        $this->assertNull($lead->fresh()->city_id);
        $this->assertNull($job->fresh()->target_city_id);

        $this->withToken('ncr-admin-token')
            ->postJson('/api/admin/locations/backfill/apply', ['confirmation' => 'APPLY_NCR_CITY_BACKFILL'])
            ->assertOk()
            ->assertJsonPath('mode', 'applied')
            ->assertJsonPath('data.applied', true)
            ->assertJsonPath('data.summary.total', 4);

        $this->assertSame($region->id, $society->fresh()->region_id);
        $this->assertSame($noida->id, $society->fresh()->city_id);
        $this->assertTrue($society->fresh()->is_published);
        $this->assertSame('Verified', $society->fresh()->status);

        $this->assertSame($region->id, $property->fresh()->region_id);
        $this->assertSame($faridabad->id, $property->fresh()->city_id);

        $this->assertSame($region->id, $lead->fresh()->region_id);
        $this->assertSame($noida->id, $lead->fresh()->city_id);

        $this->assertSame($region->id, $job->fresh()->target_region_id);
        $this->assertSame($faridabad->id, $job->fresh()->target_city_id);
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

    public function test_non_gurgaon_importer_rows_require_structured_city_context_when_ncr_is_enabled(): void
    {
        config(['features.ncr_multicity' => true]);

        $response = $this->withToken('ncr-admin-token')
            ->postJson('/api/admin/verified-importer/single', [
                'name' => 'Loose Noida Draft Society',
                'sector' => 'Sector 150',
                'builder_name' => 'NCR Builder',
                'city' => 'Noida',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'failed')
            ->assertJsonPath('data.failed_count', 1);

        $row = VerifiedSocietyImportJob::findOrFail($response->json('data.id'))->rows()->firstOrFail();

        $this->assertSame('failed', $row->status);
        $this->assertStringContainsString('structured target city', $row->errors[0]);
        $this->assertDatabaseMissing('societies', ['slug' => 'loose-noida-draft-society-sector-150-noida']);
    }

    public function test_importer_rejects_zone_and_locality_that_do_not_match_target_city(): void
    {
        config(['features.ncr_multicity' => true]);

        $region = Region::where('slug', 'delhi-ncr')->firstOrFail();
        $noida = City::where('slug', 'noida')->firstOrFail();
        $delhi = City::where('slug', 'delhi')->firstOrFail();

        $delhiZone = Zone::create([
            'region_id' => $region->id,
            'city_id' => $delhi->id,
            'name' => 'South Delhi',
            'slug' => 'south-delhi',
            'zone_type' => 'zone',
            'is_active' => true,
        ]);

        $zoneResponse = $this->withToken('ncr-admin-token')
            ->postJson('/api/admin/verified-importer/single', [
                'name' => 'Mismatched Noida Zone Society',
                'sector' => 'Sector 150',
                'builder_name' => 'NCR Builder',
                'target_region_id' => $region->id,
                'target_city_id' => $noida->id,
                'target_zone_id' => $delhiZone->id,
                'target_city' => 'Noida',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'failed');

        $zoneRow = VerifiedSocietyImportJob::findOrFail($zoneResponse->json('data.id'))->rows()->firstOrFail();
        $this->assertStringContainsString('zone does not belong', $zoneRow->errors[0]);

        $delhiLocality = Locality::create([
            'region_id' => $region->id,
            'city_id' => $delhi->id,
            'zone_id' => $delhiZone->id,
            'name' => 'Vasant Vihar',
            'slug' => 'vasant-vihar',
            'city' => 'Delhi',
            'state' => 'Delhi',
            'published_status' => 'draft',
        ]);

        $localityResponse = $this->withToken('ncr-admin-token')
            ->postJson('/api/admin/verified-importer/single', [
                'name' => 'Mismatched Noida Locality Society',
                'sector' => 'Sector 150',
                'builder_name' => 'NCR Builder',
                'target_region_id' => $region->id,
                'target_city_id' => $noida->id,
                'target_locality_id' => $delhiLocality->id,
                'target_city' => 'Noida',
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'failed');

        $localityRow = VerifiedSocietyImportJob::findOrFail($localityResponse->json('data.id'))->rows()->firstOrFail();
        $this->assertStringContainsString('locality does not belong', $localityRow->errors[0]);
    }

    public function test_ncr_city_registry_pages_are_noindex_and_not_in_sitemap_by_default(): void
    {
        config(['features.ncr_multicity' => true]);

        app(SeoPageRegistryService::class)->sync();

        $page = SeoPage::where('page_key', 'ncr-city:noida')->firstOrFail();

        $this->assertTrue($page->is_public);
        $this->assertFalse($page->is_indexable);
        $this->assertFalse($page->sitemap_included);
        $this->assertSame('held_noindex_until_approved', $page->metadata['indexing_policy']);
        $this->assertSame('Noida Society-First Home Search Preview | SocietyFlats', $page->title);
        $this->assertSame('Noida society-first home search preview', $page->h1);
        $this->assertStringContainsString('Review-only Noida city coverage preview', $page->meta_description);
        $this->assertGreaterThanOrEqual(900, $page->content_word_count);
        $this->assertGreaterThanOrEqual(8, $page->internal_link_count);
        $this->assertSame('ncr_10_city_shell_content', $page->metadata['content_readiness_version']);
        $this->assertSame(7, $page->metadata['heading_count']);

        $xml = app(LiveSitemapService::class)->body();

        $this->assertStringNotContainsString('/ncr/noida', $xml);
        $this->assertStringNotContainsString('/ncr/gurgaon', $xml);
    }

    public function test_ncr_city_sitemap_requires_indexing_flag_and_explicit_city_approval(): void
    {
        config([
            'features.ncr_multicity' => true,
            'features.ncr_city_indexing' => true,
            'features.ncr_indexable_city_slugs' => ['noida'],
        ]);

        app(SeoPageRegistryService::class)->sync();

        $noida = SeoPage::where('page_key', 'ncr-city:noida')->firstOrFail();
        $delhi = SeoPage::where('page_key', 'ncr-city:delhi')->firstOrFail();

        $this->assertTrue($noida->is_indexable);
        $this->assertTrue($noida->sitemap_included);
        $this->assertSame('approved_city_sitemap', $noida->metadata['indexing_policy']);
        $this->assertFalse($delhi->is_indexable);
        $this->assertFalse($delhi->sitemap_included);

        $xml = app(LiveSitemapService::class)->body();

        $this->assertStringContainsString('https://www.societyflats.com/ncr/noida</loc>', $xml);
        $this->assertStringNotContainsString('/ncr/delhi', $xml);
        $this->assertStringNotContainsString('/ncr/greater-noida', $xml);
    }

    public function test_ncr_city_launch_approval_requires_admin_token_global_flag_and_readiness(): void
    {
        config(['features.ncr_multicity' => true]);

        $noida = City::where('slug', 'noida')->firstOrFail();

        $this->postJson("/api/admin/locations/cities/{$noida->id}/launch-approval", [
            'confirmation' => 'APPROVE_NCR_CITY_INDEXING',
        ])->assertUnauthorized();

        $this->withToken('ncr-admin-token')
            ->postJson("/api/admin/locations/cities/{$noida->id}/launch-approval", [
                'confirmation' => 'APPROVE_NCR_CITY_INDEXING',
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'NCR city indexing flag is disabled. Keep this city held until NCR_CITY_INDEXING_ENABLED is intentionally enabled for launch review.');

        config(['features.ncr_city_indexing' => true]);

        $this->withToken('ncr-admin-token')
            ->postJson("/api/admin/locations/cities/{$noida->id}/launch-approval", [
                'confirmation' => 'APPROVE_NCR_CITY_INDEXING',
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'City is not ready for launch approval yet. Resolve the readiness blockers first.')
            ->assertJsonPath('data.city_readiness.content_ready', false);

        $this->assertDatabaseMissing('ncr_city_launch_approvals', [
            'city_slug' => 'noida',
            'status' => 'approved',
        ]);
    }

    public function test_ready_ncr_city_launch_approval_updates_registry_sitemap_and_can_be_revoked(): void
    {
        config([
            'features.ncr_multicity' => true,
            'features.ncr_city_indexing' => true,
        ]);

        $region = Region::where('slug', 'delhi-ncr')->firstOrFail();
        $noida = City::where('slug', 'noida')->firstOrFail();

        for ($i = 1; $i <= 5; $i++) {
            Society::create([
                'name' => "Noida Launch Society {$i}",
                'slug' => "noida-launch-society-{$i}",
                'region_id' => $region->id,
                'city_id' => $noida->id,
                'city' => 'Noida',
                'status' => 'Verified',
                'verification_status' => 'Verified',
                'is_published' => true,
                'score' => 8,
            ]);
        }

        for ($i = 1; $i <= 3; $i++) {
            Locality::create([
                'region_id' => $region->id,
                'city_id' => $noida->id,
                'name' => "Sector 15{$i}",
                'slug' => "sector-15{$i}",
                'city' => 'Noida',
                'state' => 'Uttar Pradesh',
                'published_status' => 'review',
            ]);
        }

        app(SeoPageRegistryService::class)->sync();
        $this->assertFalse(SeoPage::where('page_key', 'ncr-city:noida')->firstOrFail()->is_indexable);
        $this->assertStringNotContainsString('/ncr/noida', app(LiveSitemapService::class)->body());

        $this->withToken('ncr-admin-token')
            ->postJson("/api/admin/locations/cities/{$noida->id}/launch-approval", [
                'confirmation' => 'APPROVE_NCR_CITY_INDEXING',
                'approval_notes' => 'Ready after NCR launch review.',
            ])
            ->assertOk()
            ->assertJsonPath('data.city_readiness.content_ready', true)
            ->assertJsonPath('data.city_readiness.indexing_approved', true)
            ->assertJsonPath('data.city_readiness.launch_approval_status', 'approved');

        $approval = NcrCityLaunchApproval::where('city_slug', 'noida')->firstOrFail();
        $this->assertTrue($approval->approved_for_indexing);
        $this->assertTrue($approval->approved_for_sitemap);
        $this->assertSame('Ready after NCR launch review.', $approval->approval_notes);

        $noidaPage = SeoPage::where('page_key', 'ncr-city:noida')->firstOrFail();
        $this->assertTrue($noidaPage->is_indexable);
        $this->assertTrue($noidaPage->sitemap_included);
        $this->assertStringContainsString('https://www.societyflats.com/ncr/noida</loc>', app(LiveSitemapService::class)->body());

        $this->withToken('ncr-admin-token')
            ->postJson("/api/admin/locations/cities/{$noida->id}/launch-revoke", [
                'confirmation' => 'REVOKE_NCR_CITY_INDEXING',
            ])
            ->assertOk()
            ->assertJsonPath('data.city_readiness.indexing_approved', false)
            ->assertJsonPath('data.city_readiness.launch_approval_status', 'revoked');

        $noidaPage = SeoPage::where('page_key', 'ncr-city:noida')->firstOrFail();
        $this->assertFalse($noidaPage->is_indexable);
        $this->assertFalse($noidaPage->sitemap_included);
        $this->assertStringNotContainsString('/ncr/noida', app(LiveSitemapService::class)->body());
    }
}
