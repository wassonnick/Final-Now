<?php

namespace Tests\Feature;

use App\Models\Society;
use App\Models\VerifiedSocietyFieldSource;
use App\Models\VerifiedSocietyImportImage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class VerifiedSocietyImporterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
        // Imports now dispatch the one-click completion job. Under the sync queue that would
        // run the whole Google/AI enrichment pipeline inline and mutate the very data these
        // tests assert on — fake the queue so we test dispatch, not execution.
        \Illuminate\Support\Facades\Queue::fake();
    }

    public function test_routes_are_admin_only(): void
    {
        $this->getJson('/api/admin/verified-importer/jobs')->assertUnauthorized();
        $this->postJson('/api/admin/verified-importer/single', ['name' => 'Private Draft'])->assertUnauthorized();
    }

    public function test_import_dispatches_the_one_click_completion_job_for_created_drafts(): void
    {
        // The one-click promise: a V2 import must queue the completion pipeline
        // (description, cover approval, SEO) — previously only the legacy importer did,
        // so V2 batches sat empty until manual work. (Queue is faked in setUp.)
        $this->admin()->postJson('/api/admin/verified-importer/single', [
            'name' => 'ATS Completion Society',
            'builder_name' => 'ATS',
            'city' => 'Gurgaon',
            'sector' => 'Sector 109',
        ])->assertCreated();

        $society = Society::where('name', 'ATS Completion Society')->firstOrFail();
        \Illuminate\Support\Facades\Queue::assertPushed(
            \App\Jobs\CompleteImportedSocietyDraft::class,
            fn ($job) => $job->societyId === $society->id,
        );
    }

    public function test_review_queue_reports_per_society_completion_status(): void
    {
        // A freshly imported draft with only a name is incomplete against the publish gates;
        // the badge must enumerate exactly what the one-click pipeline still needs.
        $this->admin()->postJson('/api/admin/verified-importer/single', [
            'name' => 'Incomplete Badge Society',
            'sector' => 'Sector 84',
        ])->assertCreated();

        $response = $this->admin()->getJson('/api/admin/verified-importer/review')->assertOk();
        $society = collect($response->json('data.societies'))->firstWhere('name', 'Incomplete Badge Society');

        $this->assertNotNull($society, 'The imported draft must appear in the review queue.');
        $this->assertSame('incomplete', $society['completion']['state']);
        $this->assertContains('description', $society['completion']['missing']);
        $this->assertContains('published_seo', $society['completion']['missing']);
        $this->assertContains('approved_cover_image', $society['completion']['missing']);
        // Sector was supplied, so the sector/locality gate must NOT be flagged.
        $this->assertNotContains('sector_or_locality', $society['completion']['missing']);
    }

    public function test_review_queue_surfaces_ai_budget_state(): void
    {
        $this->admin()->postJson('/api/admin/verified-importer/single', ['name' => 'Budget State Society'])->assertCreated();
        app(\App\Services\Ops\AiBudgetGuard::class)->tripProviderLimit();

        $this->admin()->getJson('/api/admin/verified-importer/review')
            ->assertOk()
            ->assertJsonPath('data.ai_budget.provider_limited', true);
    }

    public function test_manual_complete_reports_provider_limit_and_does_not_fabricate(): void
    {
        // When the provider circuit-breaker is tripped, clicking "Complete draft now" must
        // explain the pause rather than silently leave a bare draft — and must not publish.
        $this->admin()->postJson('/api/admin/verified-importer/single', ['name' => 'Blocked Complete Society'])->assertCreated();
        $society = Society::where('name', 'Blocked Complete Society')->firstOrFail();
        app(\App\Services\Ops\AiBudgetGuard::class)->tripProviderLimit();

        $this->admin()->postJson("/api/admin/verified-importer/societies/{$society->id}/complete")
            ->assertOk()
            ->assertJsonPath('data.result.published', false)
            ->assertJsonPath('data.result.blocked_by', ['provider_limit']);

        $this->assertFalse($society->fresh()->is_published);
    }

    public function test_complete_all_drafts_endpoint_sweeps_importer_drafts(): void
    {
        // The 'Complete all drafts now' button = the shell sweep, admin-triggered. With the
        // provider breaker tripped it must not fabricate, and must report the pause.
        $this->admin()->postJson('/api/admin/verified-importer/single', ['name' => 'Sweep One'])->assertCreated();
        $this->admin()->postJson('/api/admin/verified-importer/single', ['name' => 'Sweep Two'])->assertCreated();
        app(\App\Services\Ops\AiBudgetGuard::class)->tripProviderLimit();

        $this->admin()->postJson('/api/admin/verified-importer/complete-all-drafts')
            ->assertOk()
            ->assertJsonPath('data.provider_limited', true)
            ->assertJsonPath('data.published', 0);

        $this->assertSame(0, Society::where('is_published', true)->count(), 'A tripped provider limit must not publish anything.');
    }

    public function test_single_import_creates_only_a_source_tracked_unpublished_draft(): void
    {
        $response = $this->admin()->postJson('/api/admin/verified-importer/single', [
            'name' => 'DLF Test Heights',
            'builder_name' => 'DLF Ltd',
            'city' => 'Gurgaon',
            'sector' => 'Sec 73',
            'rera_number' => 'HRERA-TEST-113',
            'google_maps_url' => 'https://maps.google.com/?q=28.4,77.0',
            'latitude' => 28.4,
            'longitude' => 77.0,
            'builder_url' => 'https://www.example.com/test-heights',
            'brochure_url' => 'https://www.example.com/test-heights.pdf',
            'nearby_schools' => ['Example School'],
            'nearby_office_hubs' => ['Example Business Park'],
            'cover_image_url' => 'https://images.example.com/test-heights.jpg',
        ]);

        $response->assertCreated()->assertJsonPath('data.status', 'needs_review');
        $this->assertGreaterThanOrEqual(10, $response->json('data.summary.applied_fields'));
        $response->assertJsonPath('data.summary.pending_images', 1);

        $society = Society::where('rera_number', 'HRERA-TEST-113')->firstOrFail();
        $this->assertSame('Draft', $society->status);
        $this->assertSame('Needs Review', $society->verification_status);
        $this->assertFalse($society->is_published);
        $this->assertNull($society->published_at);
        $this->assertSame('DLF', $society->builder);
        $this->assertSame('Gurugram', $society->city);
        $this->assertSame('Sector 73', $society->sector);
        $this->assertSame('7.0', $society->score);
        $this->assertSame('https://maps.google.com/?q=28.4,77.0', $society->google_maps_url);
        $this->assertSame('28.4', $society->latitude);
        $this->assertSame('77', $society->longitude);
        $this->assertSame('https://www.example.com/test-heights', $society->official_project_url);
        $this->assertSame('https://www.example.com/test-heights.pdf', $society->official_brochure_url);
        $this->assertSame(['Example School'], $society->nearby_schools);
        $this->assertSame(['Example Business Park'], $society->nearby_office_hubs);
        $this->assertSame('https://images.example.com/test-heights.jpg', $society->image_reference_url);
        $this->assertSame('Verified Society Importer V2', $society->source_name);

        $this->assertDatabaseHas('verified_society_import_sources', [
            'society_id' => $society->id,
            'source_type' => 'manual_admin',
        ]);
        $this->assertDatabaseHas('verified_society_field_sources', [
            'society_id' => $society->id,
            'field_name' => 'rera_number',
            'needs_review' => true,
        ]);
        $this->assertDatabaseHas('verified_society_import_images', [
            'society_id' => $society->id,
            'image_type' => 'cover',
            'needs_review' => true,
            'admin_approved' => false,
        ]);
        $this->assertNull($society->cover_image);
        $this->assertFalse($society->image_approved_by_admin);
    }

    public function test_single_import_populates_the_complete_edit_profile(): void
    {
        $amenities = ['Clubhouse','Swimming Pool','Gym','Kids Play Area','Tennis Court','Badminton Court','Basketball Court','Jogging Track','Power Backup','Visitor Parking','Pet Friendly','24x7 Security','Concierge','CCTV','Landscaped Greens','Senior Citizen Area'];
        $response = $this->admin()->postJson('/api/admin/verified-importer/single', [
            'name' => 'Complete Profile Society',
            'slug' => 'complete-profile-society-custom',
            'builder_name' => 'Example Developer',
            'description' => 'Source-backed complete profile description.',
            'sector' => 'Sector-49',
            'locality' => 'Sohna Road',
            'city' => 'Gurgaon',
            'state' => 'Haryana',
            'address' => 'Sector 49, Gurugram, Haryana',
            'google_maps_url' => 'https://maps.google.com/?q=28.418,77.052',
            'latitude' => 28.418,
            'longitude' => 77.052,
            'score' => 8.1,
            'security_score' => 8.2,
            'maintenance_score' => 7.9,
            'connectivity_score' => 8.3,
            'lifestyle_score' => 8.0,
            'investment_score' => 7.8,
            'rent_range' => '₹70,000 - ₹95,000',
            'buy_range' => '₹4.5 Cr - ₹6.0 Cr',
            'average_rent' => '₹82,000',
            'average_sale_price' => '₹5.2 Cr',
            'price_per_sqft' => '₹24,000',
            'rental_yield' => '3.1%',
            'amenities' => $amenities,
            'nearby_schools' => ['Example International School'],
            'nearby_metro' => ['Millennium City Centre — 20 minutes'],
            'nearby_hospitals' => ['Example Hospital'],
            'nearby_office_hubs' => ['Golf Course Road — 15 minutes'],
            'official_project_url' => 'https://example.com/complete-profile',
            'developer_url' => 'https://example.com',
            'rera_search_url' => 'https://example.com/rera-search',
            'meta_title' => 'Complete Profile Society in Sector 49',
            'meta_description' => 'Review-only SEO description from supplied source data.',
        ]);

        $response->assertCreated()->assertJsonPath('data.status', 'needs_review');
        $society = Society::where('slug', 'complete-profile-society-custom')->firstOrFail();

        $this->assertSame('Example Developer', $society->builder);
        $this->assertSame('Source-backed complete profile description.', $society->description);
        $this->assertSame('Sector 49', $society->sector);
        $this->assertSame('Sohna Road', $society->locality);
        $this->assertSame('Gurugram', $society->city);
        $this->assertSame('Haryana', $society->state);
        $this->assertSame('Sector 49, Gurugram, Haryana', $society->address);
        $this->assertSame('https://maps.google.com/?q=28.418,77.052', $society->google_maps_url);
        $this->assertSame('28.418', $society->latitude);
        $this->assertSame('77.052', $society->longitude);
        $this->assertSame('8.1', $society->score);
        $this->assertSame('8.2', $society->security_score);
        $this->assertSame('7.9', $society->maintenance_score);
        $this->assertSame('8.3', $society->connectivity_score);
        $this->assertSame('8.0', $society->lifestyle_score);
        $this->assertSame('7.8', $society->investment_score);
        $this->assertSame('₹70,000 - ₹95,000', $society->rent_range);
        $this->assertSame('₹4.5 Cr - ₹6.0 Cr', $society->buy_range);
        $this->assertSame('₹82,000', $society->average_rent);
        $this->assertSame('₹5.2 Cr', $society->average_sale_price);
        $this->assertSame('₹24,000', $society->price_per_sqft);
        $this->assertSame('3.1%', $society->rental_yield);
        $this->assertSame($amenities, $society->amenities);
        $this->assertSame(['Example International School'], $society->nearby_schools);
        $this->assertSame(['Millennium City Centre — 20 minutes'], $society->nearby_metro);
        $this->assertSame(['Example Hospital'], $society->nearby_hospitals);
        $this->assertSame(['Golf Course Road — 15 minutes'], $society->nearby_office_hubs);
        $this->assertSame('https://example.com/complete-profile', $society->official_project_url);
        $this->assertSame('https://example.com', $society->official_developer_url);
        $this->assertSame('https://example.com/rera-search', $society->rera_search_url);
        $this->assertSame('Complete Profile Society in Sector 49', $society->meta_title);
        $this->assertSame('Review-only SEO description from supplied source data.', $society->meta_description);
        $this->assertSame('Draft', $society->status);
        $this->assertSame('Needs Review', $society->verification_status);
        $this->assertFalse($society->is_published);
    }

    public function test_google_enrichment_populates_only_google_backed_fields_with_provenance(): void
    {
        config(['services.google_places_api_key' => 'test-google-key']);
        Http::fake([
            'https://maps.googleapis.com/maps/api/place/findplacefromtext/json*' => Http::response([
                'status' => 'OK',
                'candidates' => [['place_id' => 'ChIJ-google-test']],
            ]),
            'https://maps.googleapis.com/maps/api/place/details/json*' => Http::response([
                'status' => 'OK',
                'result' => [
                    'place_id' => 'ChIJ-google-test',
                    'name' => 'Google Enriched Society',
                    'formatted_address' => 'Sector 49, Gurugram, Haryana 122018, India',
                    'geometry' => ['location' => ['lat' => 28.4181234, 'lng' => 77.0525678]],
                    'url' => 'https://maps.google.com/?cid=12345',
                    'website' => 'https://example.com/google-enriched-society',
                    'photos' => [
                        ['photo_reference' => 'photo-reference-one'],
                        ['photo_reference' => 'photo-reference-two'],
                    ],
                    'address_components' => [
                        ['long_name' => 'Sector 49', 'types' => ['sublocality_level_1']],
                        ['long_name' => 'Gurugram', 'types' => ['locality']],
                        ['long_name' => 'Haryana', 'types' => ['administrative_area_level_1']],
                    ],
                ],
            ]),
        ]);

        $response = $this->admin()->postJson('/api/admin/verified-importer/single', [
            'name' => 'Google Enriched Society',
            'fetch_google' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.summary.google_enriched', true)
            ->assertJsonPath('data.summary.pending_images', 2);

        $society = Society::where('name', 'Google Enriched Society')->firstOrFail();
        $this->assertSame('ChIJ-google-test', $society->place_id);
        $this->assertSame('https://maps.google.com/?cid=12345', $society->google_maps_url);
        $this->assertSame('https://maps.google.com/?cid=12345', $society->source_url);
        $this->assertSame('Sector 49, Gurugram, Haryana 122018, India', $society->address);
        $this->assertSame('Sector 49', $society->sector);
        $this->assertSame('28.4181234', $society->latitude);
        $this->assertSame('77.0525678', $society->longitude);
        $this->assertSame('https://example.com/google-enriched-society', $society->official_project_url);
        $this->assertNull($society->security_score);
        $this->assertNull($society->average_rent);
        $this->assertSame('Draft', $society->status);
        $this->assertFalse($society->is_published);

        $this->assertDatabaseHas('verified_society_import_sources', [
            'society_id' => $society->id,
            'source_type' => 'google_places',
        ]);
        $this->assertDatabaseHas('verified_society_field_sources', [
            'society_id' => $society->id,
            'field_name' => 'latitude',
            'source_type' => 'google_places',
            'confidence_score' => 88,
        ]);
        $this->assertDatabaseHas('verified_society_import_images', [
            'society_id' => $society->id,
            'google_photo_reference' => 'photo-reference-one',
            'source_type' => 'google_photos',
            'needs_review' => true,
        ]);
    }

    public function test_google_enrichment_without_configuration_still_creates_manual_draft(): void
    {
        config(['services.google_places_api_key' => null]);

        $response = $this->admin()->postJson('/api/admin/verified-importer/single', [
            'name' => 'Manual Fallback Society',
            'fetch_google' => true,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.summary.google_enriched', false)
            ->assertJsonPath('data.created_societies_count', 1);
        $this->assertStringContainsString('not configured', (string) $response->json('message'));

        $society = Society::where('name', 'Manual Fallback Society')->firstOrFail();
        $this->assertSame('Draft', $society->status);
        $this->assertFalse($society->is_published);
        $this->assertNull($society->place_id);
    }

    public function test_existing_sparse_importer_draft_can_be_backfilled_from_google_without_overwriting_manual_values(): void
    {
        $this->admin()->postJson('/api/admin/verified-importer/single', [
            'name' => 'Legacy Sparse Google Draft',
            'address' => 'Admin supplied address',
        ])->assertCreated();
        $society = Society::where('name', 'Legacy Sparse Google Draft')->firstOrFail();

        config(['services.google_places_api_key' => 'test-google-key']);
        Http::fake([
            'https://maps.googleapis.com/maps/api/place/findplacefromtext/json*' => Http::response([
                'status' => 'OK', 'candidates' => [['place_id' => 'ChIJ-existing-draft']],
            ]),
            'https://maps.googleapis.com/maps/api/place/details/json*' => Http::response([
                'status' => 'OK',
                'result' => [
                    'place_id' => 'ChIJ-existing-draft',
                    'name' => 'Legacy Sparse Google Draft',
                    'formatted_address' => 'Sector 88, Gurugram, Haryana, India',
                    'geometry' => ['location' => ['lat' => 28.44, 'lng' => 77.04]],
                    'url' => 'https://maps.google.com/?cid=legacy-draft',
                    'photos' => [['photo_reference' => 'legacy-draft-photo']],
                    'address_components' => [
                        ['long_name' => 'Sector 88', 'types' => ['sublocality_level_1']],
                        ['long_name' => 'Gurugram', 'types' => ['locality']],
                        ['long_name' => 'Haryana', 'types' => ['administrative_area_level_1']],
                    ],
                ],
            ]),
        ]);

        $response = $this->admin()->postJson("/api/admin/verified-importer/societies/{$society->id}/enrich-google");
        $response->assertOk()->assertJsonPath('pending_images', 1);

        $society->refresh();
        $this->assertSame('Admin supplied address', $society->address);
        $this->assertSame('Sector 88', $society->sector);
        $this->assertSame('ChIJ-existing-draft', $society->place_id);
        $this->assertSame('https://maps.google.com/?cid=legacy-draft', $society->google_maps_url);
        $this->assertSame('https://maps.google.com/?cid=legacy-draft', $society->source_url);
        $this->assertSame('28.44', $society->latitude);
        $this->assertSame('77.04', $society->longitude);
        $this->assertSame('Draft', $society->status);
        $this->assertFalse($society->is_published);
        $this->assertDatabaseHas('verified_society_field_sources', [
            'society_id' => $society->id,
            'field_name' => 'sector',
            'source_type' => 'google_places',
            'needs_review' => true,
        ]);
        $this->assertDatabaseHas('verified_society_import_images', [
            'society_id' => $society->id,
            'google_photo_reference' => 'legacy-draft-photo',
            'needs_review' => true,
        ]);
    }

    public function test_single_import_applies_rera_and_normalized_amenities_while_preserving_extra_provenance(): void
    {
        $this->admin()->postJson('/api/admin/verified-importer/single', [
            'name' => 'RERA Amenity Draft',
            'rera_number' => 'GGM/TEST/2026/001',
            'rera_url' => 'https://example.com/rera/project-001',
            'promoter_name' => 'Example Promoter Private Limited',
            'rera_status' => 'Registered',
            'registration_validity' => 'December 2030',
            'certificate_url' => 'https://example.com/rera/project-001-certificate.pdf',
            'amenities' => ['clubhouse', 'pool', 'security', 'cctv', 'power_backup'],
            'source_type' => 'rera',
        ])->assertCreated();

        $society = Society::where('name', 'RERA Amenity Draft')->firstOrFail();
        $this->assertSame('GGM/TEST/2026/001', $society->rera_number);
        $this->assertSame('Registered', $society->rera_status);
        $this->assertSame('https://example.com/rera/project-001', $society->official_rera_source_url);
        $this->assertSame(['Clubhouse','Swimming Pool','24x7 Security','CCTV','Power Backup'], $society->amenities);
        $this->assertDatabaseHas('verified_society_field_sources', [
            'society_id' => $society->id,
            'field_name' => 'promoter_name',
            'source_type' => 'rera',
            'needs_review' => true,
        ]);
        $this->assertSame('Draft', $society->status);
        $this->assertFalse($society->is_published);
    }

    public function test_excel_import_applies_amenities_and_market_ranges_with_review_confidence(): void
    {
        $this->admin()->postJson('/api/admin/verified-importer/excel/import', [
            'file_name' => 'market-layer.csv',
            'rows' => [[
                'name' => 'Excel Market Draft',
                'amenities' => 'Gym|Kids Play Area;visitor_parking',
                'rent_min' => '₹40,000',
                'rent_max' => '₹55,000',
                'resale_min' => '₹2.0 Cr',
                'resale_max' => '₹2.6 Cr',
                'average_rent' => '₹47,000',
                'average_sale_price' => '₹2.3 Cr',
                'price_per_sqft' => '₹15,000',
                'rental_yield' => '2.8%',
                'maintenance_charges' => '₹5 per sq ft per month',
                'market_notes' => 'Imported broker worksheet; verify before approval.',
                'registration_date' => '2026-01-15',
                'oc_cc_pcc_url' => 'https://example.com/oc-certificate.pdf',
                'nearby_malls' => 'Example Mall',
                'nearby_markets' => 'Example Market',
                'commute_notes' => 'Verify commute estimates manually.',
                'source_type' => 'excel',
            ]],
        ])->assertCreated();

        $society = Society::where('name', 'Excel Market Draft')->firstOrFail();
        $this->assertSame(['Gym','Kids Play Area','Visitor Parking'], $society->amenities);
        $this->assertSame('₹40,000 - ₹55,000', $society->rent_range);
        $this->assertSame('₹2.0 Cr - ₹2.6 Cr', $society->buy_range);
        $this->assertSame('₹47,000', $society->average_rent);
        $this->assertSame('₹2.3 Cr', $society->average_sale_price);
        $this->assertSame('₹15,000', $society->price_per_sqft);
        $this->assertSame('2.8%', $society->rental_yield);
        $this->assertSame('₹5 per sq ft per month', $society->maintenance_charges);
        $this->assertDatabaseHas('verified_society_field_sources', [
            'society_id' => $society->id,
            'field_name' => 'average_rent',
            'confidence_score' => 60,
            'needs_review' => true,
        ]);
        $this->assertDatabaseHas('verified_society_field_sources', [
            'society_id' => $society->id,
            'field_name' => 'market_notes',
        ]);
        foreach (['registration_date','oc_cc_pcc_url','nearby_malls','nearby_markets','commute_notes'] as $field) {
            $this->assertDatabaseHas('verified_society_field_sources', ['society_id'=>$society->id,'field_name'=>$field]);
        }
    }

    public function test_rera_source_layer_applies_supported_fields_and_tracks_legal_metadata(): void
    {
        $this->admin()->postJson('/api/admin/verified-importer/single', ['name'=>'RERA Layer Draft'])->assertCreated();
        $society=Society::where('name','RERA Layer Draft')->firstOrFail();
        $this->admin()->postJson("/api/admin/verified-importer/societies/{$society->id}/source-layers/rera",[
            'rera_number'=>'GGM/RERA/LAYER/1','rera_url'=>'https://example.com/rera/layer-1','legal_name'=>'RERA Layer Legal Name',
            'promoter_name'=>'Layer Promoter','rera_status'=>'Registered','registration_date'=>'2026-01-01','registration_validity'=>'2030-12-31',
        ])->assertOk()->assertJsonPath('layer.confidence',95);
        $society->refresh();
        $this->assertSame('GGM/RERA/LAYER/1',$society->rera_number);
        $this->assertSame('Registered',$society->rera_status);
        $this->assertSame('https://example.com/rera/layer-1',$society->official_rera_source_url);
        $this->assertSame('https://example.com/rera/layer-1',$society->rera_search_url);
        $this->assertDatabaseHas('verified_society_field_sources',['society_id'=>$society->id,'field_name'=>'rera_search_url','source_type'=>'rera','confidence_score'=>95,'needs_review'=>true]);
        $this->assertDatabaseHas('verified_society_field_sources',['society_id'=>$society->id,'field_name'=>'promoter_name','source_type'=>'rera','confidence_score'=>95,'needs_review'=>true]);
        $this->assertFalse($society->is_published);
    }

    public function test_builder_layer_applies_builder_amenities_description_and_deduped_images(): void
    {
        $this->admin()->postJson('/api/admin/verified-importer/single', ['name'=>'Builder Layer Draft'])->assertCreated();
        $society=Society::where('name','Builder Layer Draft')->firstOrFail();
        $payload=[
            'builder_name'=>'Example Builder','builder_url'=>'https://example.com/builder','official_project_url'=>'https://example.com/builder-layer','brochure_url'=>'https://example.com/builder-layer.pdf',
            'project_status'=>'Under Construction','amenities'=>'clubhouse|pool|security','description_source_text'=>'Official brochure source text.',
            'cover_image_url'=>'https://images.example.com/builder-cover.jpg','gallery_image_urls'=>'https://images.example.com/builder-gallery.jpg|https://images.example.com/builder-cover.jpg',
        ];
        $this->admin()->postJson("/api/admin/verified-importer/societies/{$society->id}/source-layers/builder",$payload)->assertOk();
        $this->admin()->postJson("/api/admin/verified-importer/societies/{$society->id}/source-layers/builder",$payload)->assertOk();
        $society->refresh();
        $this->assertSame('Example Builder',$society->builder);
        $this->assertSame('https://example.com/builder',$society->official_developer_url);
        $this->assertSame('https://example.com/builder-layer',$society->official_project_url);
        $this->assertDatabaseHas('verified_society_field_sources',['society_id'=>$society->id,'field_name'=>'developer_url','source_type'=>'builder_brochure','needs_review'=>true]);
        $this->assertSame(['Clubhouse','Swimming Pool','24x7 Security'],$society->amenities);
        $this->assertSame('Official brochure source text.',$society->description);
        $this->assertSame(2,VerifiedSocietyImportImage::where('society_id',$society->id)->count());
        $this->assertFalse($society->image_approved_by_admin);
        $this->assertFalse($society->is_published);
    }

    public function test_nearby_source_layer_applies_supported_fields_and_tracks_extra_categories(): void
    {
        $this->admin()->postJson('/api/admin/verified-importer/single', ['name'=>'Nearby Layer Draft'])->assertCreated();
        $society=Society::where('name','Nearby Layer Draft')->firstOrFail();
        $this->admin()->postJson("/api/admin/verified-importer/societies/{$society->id}/source-layers/nearby",[
            'nearby_schools'=>'School One|School Two','nearby_hospitals'=>'Hospital One','nearby_metro'=>'Metro One — verify distance',
            'office_hubs'=>'Cyber City','nearby_malls'=>'Mall One','nearby_markets'=>'Market One','commute_notes'=>'Manual source; verify travel time.',
        ])->assertOk();
        $society->refresh();
        $this->assertSame(['School One','School Two'],$society->nearby_schools);
        $this->assertSame(['Hospital One'],$society->nearby_hospitals);
        $this->assertSame(['Cyber City'],$society->nearby_office_hubs);
        $this->assertDatabaseHas('verified_society_field_sources',['society_id'=>$society->id,'field_name'=>'nearby_malls','needs_review'=>true]);
        $this->assertFalse($society->is_published);
    }

    public function test_market_source_layer_applies_ranges_as_unverified_estimates(): void
    {
        $this->admin()->postJson('/api/admin/verified-importer/single', ['name'=>'Market Layer Draft'])->assertCreated();
        $society=Society::where('name','Market Layer Draft')->firstOrFail();
        $this->admin()->postJson("/api/admin/verified-importer/societies/{$society->id}/source-layers/market",[
            'rent_min'=>'₹45,000','rent_max'=>'₹60,000','resale_min'=>'₹2.2 Cr','resale_max'=>'₹2.8 Cr','average_rent'=>'₹52,000',
            'market_notes'=>'Market estimate — needs review','source_type'=>'portal_reference','source_url'=>'https://example.com/market-reference',
        ])->assertOk();
        $society->refresh();
        $this->assertSame('₹45,000 - ₹60,000',$society->rent_range);
        $this->assertSame('₹2.2 Cr - ₹2.8 Cr',$society->buy_range);
        $this->assertDatabaseHas('verified_society_field_sources',['society_id'=>$society->id,'field_name'=>'rent_min','source_type'=>'portal_reference','confidence_score'=>70,'needs_review'=>true,'admin_approved'=>false]);
        $this->assertSame('Draft',$society->status);
        $this->assertFalse($society->is_published);
    }

    public function test_description_generator_uses_present_fields_without_inventing_rera_or_prices(): void
    {
        $this->admin()->postJson('/api/admin/verified-importer/single', [
            'name' => 'Description Rule Draft',
            'builder_name' => 'Example Builder',
            'sector' => 'Sector 70',
            'amenities' => ['Clubhouse', 'Gym'],
        ])->assertCreated();
        $society = Society::where('name', 'Description Rule Draft')->firstOrFail();

        $response = $this->admin()->postJson("/api/admin/verified-importer/societies/{$society->id}/generate-description");
        $response->assertOk();
        $description = (string) $response->json('description');
        $this->assertStringContainsString('Example Builder', $description);
        $this->assertStringContainsString('Clubhouse, Gym', $description);
        $this->assertStringNotContainsString('RERA', $description);
        $this->assertStringNotContainsString('rent range', $description);
        $this->assertStringNotContainsString('resale range', $description);
        $this->assertDatabaseHas('verified_society_field_sources', [
            'society_id' => $society->id,
            'field_name' => 'description',
            'source_type' => 'internal_generator',
            'confidence_score' => 65,
            'needs_review' => true,
        ]);
        $this->assertFalse($society->fresh()->is_published);
    }

    public function test_seo_generator_changes_availability_copy_only_when_market_data_exists(): void
    {
        foreach ([['SEO Without Market', null], ['SEO With Market', '₹50,000 - ₹65,000']] as [$name, $rent]) {
            $payload = ['name' => $name, 'sector' => 'Sector 65'];
            if ($rent) $payload['rent_range'] = $rent;
            $this->admin()->postJson('/api/admin/verified-importer/single', $payload)->assertCreated();
        }
        $without = Society::where('name', 'SEO Without Market')->firstOrFail();
        $with = Society::where('name', 'SEO With Market')->firstOrFail();

        $this->admin()->postJson("/api/admin/verified-importer/societies/{$without->id}/generate-seo")->assertOk();
        $this->admin()->postJson("/api/admin/verified-importer/societies/{$with->id}/generate-seo")->assertOk();

        $this->assertStringContainsString('upcoming verified rental/resale listings', $without->fresh()->meta_description);
        $this->assertStringContainsString('imported rental/resale information', $with->fresh()->meta_description);
        $this->assertStringNotContainsString('upcoming verified', $with->fresh()->meta_description);
        $this->assertFalse($without->is_published);
        $this->assertFalse($with->is_published);
    }

    public function test_draft_score_generator_is_deterministic_capped_and_review_pending(): void
    {
        $this->admin()->postJson('/api/admin/verified-importer/single', [
            'name' => 'Score Rule Draft',
            'latitude' => 28.4,
            'longitude' => 77.0,
            'google_maps_url' => 'https://maps.google.com/?q=28.4,77.0',
            'nearby_schools' => ['School'],
            'nearby_hospitals' => ['Hospital'],
            'nearby_metro' => ['Metro'],
            'nearby_office_hubs' => ['Office Hub'],
            'amenities' => ['Clubhouse','Gym','24x7 Security','CCTV','Power Backup'],
            'rera_number' => 'RERA-SCORE-1',
            'official_project_url' => 'https://example.com/score-rule',
            'rent_range' => '₹50,000 - ₹60,000',
            'maintenance_charges' => '₹5 per sq ft',
        ])->assertCreated();
        $society = Society::where('name', 'Score Rule Draft')->firstOrFail();

        $this->admin()->postJson("/api/admin/verified-importer/societies/{$society->id}/generate-scores", ['replace' => true])->assertOk();
        $society->refresh();
        $this->assertSame('9.2', $society->score);
        $this->assertLessThanOrEqual(9.2, (float) $society->score);
        $this->assertSame('8.3', $society->connectivity_score);
        $this->assertSame('7.6', $society->lifestyle_score);
        $this->assertSame('8.0', $society->security_score);
        $this->assertSame('7.5', $society->maintenance_score);
        $this->assertSame('7.5', $society->investment_score);
        $this->assertDatabaseHas('verified_society_field_sources', [
            'society_id' => $society->id,
            'field_name' => 'score',
            'source_type' => 'importer_rule_engine',
            'confidence_score' => 65,
            'needs_review' => true,
        ]);
        $this->assertSame('Draft', $society->status);
        $this->assertFalse($society->is_published);
    }

    public function test_exact_duplicate_is_skipped_by_default(): void
    {
        Society::create([
            'name' => 'Existing RERA Society',
            'slug' => 'existing-rera-society-sector-54-gurugram',
            'city' => 'Gurugram',
            'sector' => 'Sector 54',
            'rera_number' => 'HRERA-DUPLICATE-1',
        ]);

        $response = $this->admin()->postJson('/api/admin/verified-importer/single', [
            'name' => 'Existing RERA Society',
            'city' => 'Gurugram',
            'sector' => 'Sector 54',
            'rera_number' => 'HRERA-DUPLICATE-1',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.skipped_count', 1)
            ->assertJsonPath('data.rows.0.status', 'duplicate');
        $this->assertSame(1, Society::count());
    }

    public function test_unsafe_image_reference_fails_the_row_without_creating_a_society(): void
    {
        $response = $this->admin()->postJson('/api/admin/verified-importer/single', [
            'name' => 'Unsafe Image Draft',
            'cover_image_url' => 'http://127.0.0.1/private.jpg',
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'failed')
            ->assertJsonPath('data.failed_count', 1);
        $this->assertDatabaseMissing('societies', ['name' => 'Unsafe Image Draft']);
    }

    public function test_bulk_import_isolates_bad_rows(): void
    {
        $response = $this->admin()->postJson('/api/admin/verified-importer/bulk', [
            'items' => [
                ['name' => 'Valid Bulk Draft', 'city' => 'Gurugram'],
                ['name' => '', 'city' => 'Gurugram'],
            ],
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'partially_completed')
            ->assertJsonPath('data.created_societies_count', 1)
            ->assertJsonPath('data.failed_count', 1);

        $society = Society::where('name', 'Valid Bulk Draft')->firstOrFail();
        $this->assertFalse($society->is_published);
        $this->assertDatabaseHas('verified_society_import_rows', ['status' => 'failed']);
    }

    public function test_bulk_text_maps_name_sector_and_builder_into_profile(): void
    {
        $this->admin()->postJson('/api/admin/verified-importer/bulk', [
            'items' => "DLF Alameda | Sector 73 | DLF\nM3M Golf Estate, Sector 65, M3M",
        ])->assertCreated()->assertJsonPath('data.created_societies_count', 2);

        $alameda = Society::where('name', 'DLF Alameda')->firstOrFail();
        $this->assertSame('Sector 73', $alameda->sector);
        $this->assertSame('DLF', $alameda->builder);
        $this->assertSame('Gurugram', $alameda->city);
        $this->assertFalse($alameda->is_published);

        $golfEstate = Society::where('name', 'M3M Golf Estate')->firstOrFail();
        $this->assertSame('Sector 65', $golfEstate->sector);
        $this->assertSame('M3M', $golfEstate->builder);
    }

    public function test_csv_preview_maps_aliases_and_defaults_city(): void
    {
        $file = UploadedFile::fake()->createWithContent(
            'societies.csv',
            "society name,developer,sector/location,cover photo\nAlias Society,DLF Ltd,Sec 54,https://images.example.com/alias.jpg\n",
        );

        $this->admin()->post('/api/admin/verified-importer/excel/preview', ['file' => $file])
            ->assertOk()
            ->assertJsonPath('data.mapping.name', 0)
            ->assertJsonPath('data.mapping.builder_name', 1)
            ->assertJsonPath('data.rows.0.city', 'Gurugram')
            ->assertJsonPath('data.rows.0.name', 'Alias Society');
    }

    public function test_excel_confirm_applies_recognized_profile_fields_and_image_candidate(): void
    {
        $response = $this->admin()->postJson('/api/admin/verified-importer/excel/import', [
            'file_name' => 'verified.csv',
            'rows' => [[
                'name' => 'Godrej Aristocrat Import Test',
                'developer' => 'Godrej Properties',
                'city' => 'Gurgaon',
                'sector' => 'Sector-49',
                'locality' => 'Sohna Road',
                'rera_no' => 'TEST-RERA-123',
                'official_project_url' => 'https://example.com/godrej-aristocrat',
                'brochure_url' => 'https://example.com/godrej-aristocrat.pdf',
                'office_hubs' => 'Cyber City|Golf Course Road',
                'rent_range' => '₹75,000 - ₹90,000',
                'price per sq ft' => '₹23,500',
                'amenities' => 'Clubhouse|Gym|24x7 Security',
                'seo_title' => 'Godrej Aristocrat Import Test Profile',
                'seo_description' => 'Source-backed Excel SEO description.',
                'cover_image_url' => 'https://example.com/image.jpg',
                'source_type' => 'excel',
            ]],
        ]);

        $response->assertCreated()->assertJsonPath('data.summary.pending_images', 1);
        $society = Society::where('name', 'Godrej Aristocrat Import Test')->firstOrFail();
        $this->assertSame('Godrej Properties', $society->builder);
        $this->assertSame('Sector 49', $society->sector);
        $this->assertSame('Sohna Road', $society->locality);
        $this->assertSame('TEST-RERA-123', $society->rera_number);
        $this->assertSame('https://example.com/godrej-aristocrat', $society->official_project_url);
        $this->assertSame('https://example.com/godrej-aristocrat.pdf', $society->official_brochure_url);
        $this->assertSame('https://example.com/image.jpg', $society->image_reference_url);
        $this->assertSame('₹75,000 - ₹90,000', $society->rent_range);
        $this->assertSame('₹23,500', $society->price_per_sqft);
        $this->assertSame(['Clubhouse','Gym','24x7 Security'], $society->amenities);
        $this->assertSame('Godrej Aristocrat Import Test Profile', $society->meta_title);
        $this->assertSame('Source-backed Excel SEO description.', $society->meta_description);
        $this->assertFalse($society->is_published);
    }

    public function test_field_and_cover_approval_never_publish_the_society(): void
    {
        $this->admin()->postJson('/api/admin/verified-importer/single', [
            'name' => 'Review Guard Society',
            'city' => 'Gurugram',
            'description' => 'Source-backed review text.',
            'cover_image_url' => 'https://images.example.com/review-guard.jpg',
        ])->assertCreated();

        $society = Society::where('name', 'Review Guard Society')->firstOrFail();
        $field = VerifiedSocietyFieldSource::where('society_id', $society->id)
            ->where('field_name', 'description')->firstOrFail();
        $image = VerifiedSocietyImportImage::where('society_id', $society->id)->firstOrFail();
        $society->update(['description' => null]);

        $this->admin()->postJson("/api/admin/verified-importer/fields/{$field->id}/approve")
            ->assertOk()
            ->assertJsonPath('society.description', 'Source-backed review text.');
        $this->admin()->postJson("/api/admin/verified-importer/images/{$image->id}/set-cover")
            ->assertOk();

        $society->refresh();
        $this->assertSame('Draft', $society->status);
        $this->assertSame('Needs Review', $society->verification_status);
        $this->assertFalse($society->is_published);
        $this->assertNull($society->published_at);
        $this->assertTrue($society->image_approved_by_admin);
    }

    public function test_high_confidence_apply_restores_selected_profile_fields_without_publishing(): void
    {
        $this->admin()->postJson('/api/admin/verified-importer/single', [
            'name' => 'High Confidence Draft',
            'builder_name' => 'Godrej Properties',
            'sector' => 'Sector 49',
            'city' => 'Gurugram',
        ])->assertCreated();

        $society = Society::where('name', 'High Confidence Draft')->firstOrFail();
        $society->update(['builder' => null, 'sector' => null]);

        $this->admin()->postJson("/api/admin/verified-importer/societies/{$society->id}/apply-high-confidence")
            ->assertOk();

        $society->refresh();
        $this->assertSame('Godrej Properties', $society->builder);
        $this->assertSame('Sector 49', $society->sector);
        $this->assertSame('Draft', $society->status);
        $this->assertSame('Needs Review', $society->verification_status);
        $this->assertFalse($society->is_published);
    }

    public function test_google_nearby_is_admin_triggered_cached_and_source_tracked(): void
    {
        Cache::flush();config(['services.google_places_api_key'=>'google-test-key']);
        Http::fake(['maps.googleapis.com/*'=>Http::response(['status'=>'OK','results'=>[ ['name'=>'Nearby Place','vicinity'=>'Sector 104','rating'=>4.2,'geometry'=>['location'=>['lat'=>28.49,'lng'=>77.01]]] ]],200)]);
        $this->admin()->postJson('/api/admin/verified-importer/single',['name'=>'Nearby Google Draft','latitude'=>28.4833,'longitude'=>77.002,'google_maps_url'=>'https://maps.google.com/?q=28.4833,77.002'])->assertCreated();
        $society=Society::where('name','Nearby Google Draft')->firstOrFail();
        $url="/api/admin/verified-importer/societies/{$society->id}/nearby-google";
        $this->admin()->postJson($url)->assertOk()->assertJsonPath('layer.confidence',85);
        $this->admin()->postJson($url)->assertOk();
        Http::assertSentCount(5);
        $society->refresh();
        $this->assertCount(1,$society->nearby_schools);$this->assertCount(1,$society->nearby_hospitals);$this->assertCount(1,$society->nearby_metro);$this->assertCount(1,$society->nearby_office_hubs);
        $this->assertDatabaseHas('verified_society_field_sources',['society_id'=>$society->id,'field_name'=>'nearby_schools','source_type'=>'google_places_nearby','confidence_score'=>85,'needs_review'=>true]);
        $this->assertFalse($society->is_published);
    }

    public function test_score_increases_after_nearby_and_market_layers(): void
    {
        $this->admin()->postJson('/api/admin/verified-importer/single',['name'=>'Score Growth Draft','builder_name'=>'Builder','latitude'=>28.4,'longitude'=>77.0,'google_place_id'=>'place-score','google_maps_url'=>'https://maps.google.com/?q=28.4,77.0','rera_number'=>'RERA-GROWTH','official_project_url'=>'https://example.com/growth','amenities'=>['Clubhouse','Gym','Swimming Pool','Tennis Court','Basketball Court']])->assertCreated();
        $society=Society::where('name','Score Growth Draft')->firstOrFail();
        $this->admin()->postJson("/api/admin/verified-importer/societies/{$society->id}/generate-scores",['replace'=>true])->assertOk();
        $before=(float)$society->fresh()->score;
        $this->admin()->postJson("/api/admin/verified-importer/societies/{$society->id}/source-layers/nearby",['nearby_schools'=>'School','nearby_hospitals'=>'Hospital','nearby_metro'=>'Metro','office_hubs'=>'Office','nearby_malls'=>'Mall'])->assertOk();
        $this->admin()->postJson("/api/admin/verified-importer/societies/{$society->id}/source-layers/market",['rent_min'=>'85000','rent_max'=>'120000','buy_min'=>'3.5 Cr','buy_max'=>'5.2 Cr','price_per_sqft'=>'22000','maintenance_charges'=>'5 per sq ft','market_source_type'=>'broker_input'])->assertOk();
        $this->admin()->postJson("/api/admin/verified-importer/societies/{$society->id}/generate-scores",['replace'=>true])->assertOk();
        $society->refresh();
        $this->assertGreaterThan($before,(float)$society->score);$this->assertSame('9.2',$society->score);$this->assertSame('8.0',$society->investment_score);$this->assertSame('7.5',$society->maintenance_score);
        $this->assertSame('85000 - 120000',$society->rent_range);$this->assertSame('3.5 Cr - 5.2 Cr',$society->buy_range);
        $this->assertDatabaseHas('verified_society_field_sources',['society_id'=>$society->id,'field_name'=>'buy_min','source_type'=>'broker_input','needs_review'=>true,'admin_approved'=>false]);
        $this->assertFalse($society->is_published);
    }

    public function test_imported_images_are_listed_and_can_be_approved_to_cover_and_gallery(): void
    {
        $this->admin()->postJson('/api/admin/verified-importer/single',['name'=>'Image Review Draft','cover_image_url'=>'https://images.example.com/cover.jpg','gallery_image_urls'=>['https://images.example.com/gallery.jpg'],'google_photo_references'=>['google-photo-one','google-photo-two'],'image_attribution'=>'Google Places'])->assertCreated();
        $society=Society::where('name','Image Review Draft')->firstOrFail();
        $this->admin()->getJson("/api/admin/societies/{$society->id}")->assertOk()->assertJsonCount(4,'data.verified_import_images');
        $direct=VerifiedSocietyImportImage::where('society_id',$society->id)->where('source_url','https://images.example.com/gallery.jpg')->firstOrFail();
        $google=VerifiedSocietyImportImage::where('society_id',$society->id)->where('google_photo_reference','google-photo-two')->firstOrFail();
        $cover=VerifiedSocietyImportImage::where('society_id',$society->id)->where('source_url','https://images.example.com/cover.jpg')->firstOrFail();
        $this->admin()->postJson("/api/admin/verified-importer/images/{$direct->id}/approve")->assertOk();
        $this->admin()->postJson("/api/admin/verified-importer/images/{$google->id}/approve")->assertOk();
        $this->admin()->postJson("/api/admin/verified-importer/images/{$cover->id}/set-cover")->assertOk();
        $society->refresh();
        $this->assertContains('https://images.example.com/gallery.jpg',$society->approved_gallery_image_urls);
        $this->assertTrue(collect($society->image_candidates)->contains(fn($item)=>($item['photo_reference']??null)==='google-photo-two'&&($item['approved']??false)));
        $this->assertSame('https://images.example.com/cover.jpg',$society->cover_image);$this->assertTrue($society->image_approved_by_admin);$this->assertFalse($society->is_published);
    }

    public function test_rejecting_an_approved_image_removes_it_from_public_use(): void
    {
        $this->admin()->postJson('/api/admin/verified-importer/single',['name'=>'Reject Image Draft','cover_image_url'=>'https://images.example.com/reject.jpg'])->assertCreated();
        $society=Society::where('name','Reject Image Draft')->firstOrFail();$image=VerifiedSocietyImportImage::where('society_id',$society->id)->firstOrFail();
        $this->admin()->postJson("/api/admin/verified-importer/images/{$image->id}/set-cover")->assertOk();
        $this->admin()->postJson("/api/admin/verified-importer/images/{$image->id}/reject")->assertOk();
        $society->refresh();$image->refresh();
        $this->assertNull($society->cover_image);$this->assertFalse($society->image_approved_by_admin);$this->assertTrue($image->admin_rejected);$this->assertFalse($society->is_published);
    }

    public function test_rejecting_an_applied_field_removes_it_without_overwriting_manual_edits(): void
    {
        $this->admin()->postJson('/api/admin/verified-importer/single',['name'=>'Reject Field Draft','builder_name'=>'Imported Builder'])->assertCreated();
        $society=Society::where('name','Reject Field Draft')->firstOrFail();
        $field=VerifiedSocietyFieldSource::where('society_id',$society->id)->where('field_name','builder_name')->firstOrFail();

        $this->admin()->postJson("/api/admin/verified-importer/fields/{$field->id}/reject")
            ->assertOk()->assertJsonPath('cleared_fields.0','builder');
        $this->assertNull($society->fresh()->builder);

        $replacement=VerifiedSocietyFieldSource::create($field->only(['import_job_id','society_id','field_name','source_type','source_name','confidence_score'])+[
            'field_value'=>'Second Imported Builder','raw_value'=>'Second Imported Builder','normalized_value'=>'Second Imported Builder',
            'is_selected_value'=>true,'needs_review'=>true,'admin_approved'=>false,'admin_rejected'=>false,
        ]);
        $society->update(['builder'=>'Manual Admin Builder']);
        $this->admin()->postJson("/api/admin/verified-importer/fields/{$replacement->id}/reject")->assertOk()->assertJsonCount(0,'cleared_fields');
        $this->assertSame('Manual Admin Builder',$society->fresh()->builder);
    }

    public function test_rejecting_attached_import_image_works_without_unpublishing_existing_society(): void
    {
        $society=Society::create(['name'=>'Existing Published Society','slug'=>'existing-published-society','city'=>'Gurugram','state'=>'Haryana','status'=>'Verified','verification_status'=>'Verified','is_published'=>true,'published_at'=>now(),'score'=>8.0,'source_name'=>'Legacy Admin']);
        $job=\App\Models\VerifiedSocietyImportJob::create(['job_type'=>'single','status'=>'needs_review','total_rows'=>1,'processed_rows'=>1]);
        $image=VerifiedSocietyImportImage::create(['import_job_id'=>$job->id,'society_id'=>$society->id,'image_type'=>'gallery','source_type'=>'manual_admin','source_url'=>'https://images.example.com/attached.jpg','needs_review'=>true,'admin_approved'=>false,'admin_rejected'=>false]);

        $this->admin()->postJson("/api/admin/verified-importer/images/{$image->id}/reject")
            ->assertOk()->assertJsonPath('data.admin_rejected',true)->assertJsonPath('society.is_published',true);
        $this->assertTrue($society->fresh()->is_published);
    }

    public function test_replacing_an_approved_cover_requires_confirmation(): void
    {
        $this->admin()->postJson('/api/admin/verified-importer/single',['name'=>'Cover Confirmation Draft','cover_image_url'=>'https://images.example.com/cover-one.jpg','gallery_image_urls'=>['https://images.example.com/cover-two.jpg']])->assertCreated();
        $society=Society::where('name','Cover Confirmation Draft')->firstOrFail();$one=VerifiedSocietyImportImage::where('source_url','https://images.example.com/cover-one.jpg')->firstOrFail();$two=VerifiedSocietyImportImage::where('source_url','https://images.example.com/cover-two.jpg')->firstOrFail();
        $this->admin()->postJson("/api/admin/verified-importer/images/{$one->id}/set-cover")->assertOk();
        $this->admin()->postJson("/api/admin/verified-importer/images/{$two->id}/set-cover")->assertStatus(409)->assertJsonPath('requires_confirmation',true);
        $this->assertSame('https://images.example.com/cover-one.jpg',$society->fresh()->cover_image);
        $this->admin()->postJson("/api/admin/verified-importer/images/{$two->id}/set-cover",['replace'=>true])->assertOk();
        $this->assertSame('https://images.example.com/cover-two.jpg',$society->fresh()->cover_image);$this->assertFalse($society->is_published);
    }

    public function test_google_photo_preview_uses_authenticated_proxy(): void
    {
        config(['services.google_places_api_key'=>'google-test-key']);Http::fake(['maps.googleapis.com/*'=>Http::response('image-bytes',200,['Content-Type'=>'image/jpeg'])]);
        $this->admin()->postJson('/api/admin/verified-importer/single',['name'=>'Preview Image Draft','google_photo_references'=>['preview-reference']])->assertCreated();
        $image=VerifiedSocietyImportImage::where('google_photo_reference','preview-reference')->firstOrFail();
        $this->admin()->get("/api/admin/verified-importer/images/{$image->id}/preview")->assertOk()->assertHeader('Content-Type','image/jpeg');
    }

    public function test_template_download_is_available_to_admin(): void
    {
        $this->admin()->get('/api/admin/verified-importer/template')
            ->assertOk()
            ->assertHeader('content-type', 'text/csv; charset=UTF-8');
    }

    private function admin(): static
    {
        return $this->withHeaders(['X-Admin-Token' => 'admin-test-token']);
    }
}
