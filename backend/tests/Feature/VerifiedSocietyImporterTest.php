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
            'cover_image_url' => 'https://images.example.com/test-heights.jpg',
        ]);

        $response->assertCreated()->assertJsonPath('data.status', 'needs_review');

        $society = Society::where('rera_number', 'HRERA-TEST-113')->firstOrFail();
        $this->assertSame('Draft', $society->status);
        $this->assertSame('Needs Review', $society->verification_status);
        $this->assertFalse($society->is_published);
        $this->assertNull($society->published_at);
        $this->assertSame('DLF', $society->builder);
        $this->assertSame('Gurugram', $society->city);
        $this->assertSame('Sector 73', $society->sector);
        $this->assertSame('0.0', $society->score);

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

        $this->admin()->postJson("/api/admin/verified-importer/fields/{$field->id}/approve")
            ->assertOk();
        $this->admin()->postJson("/api/admin/verified-importer/images/{$image->id}/set-cover")
            ->assertOk();

        $society->refresh();
        $this->assertSame('Draft', $society->status);
        $this->assertSame('Needs Review', $society->verification_status);
        $this->assertFalse($society->is_published);
        $this->assertNull($society->published_at);
        $this->assertTrue($society->image_approved_by_admin);
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
