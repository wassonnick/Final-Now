<?php

namespace Tests\Feature;

use App\Models\Society;
use App\Models\VerifiedSocietyFieldSource;
use App\Models\VerifiedSocietyImportImage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class VerifiedSocietyImporterTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
    }

    public function test_routes_are_admin_only(): void
    {
        $this->getJson('/api/admin/verified-importer/jobs')->assertUnauthorized();
        $this->postJson('/api/admin/verified-importer/single', ['name' => 'Private Draft'])->assertUnauthorized();
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
