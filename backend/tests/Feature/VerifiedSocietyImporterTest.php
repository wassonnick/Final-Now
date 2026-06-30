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
