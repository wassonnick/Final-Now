<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class SocietySpreadsheetImportTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token', 'services.gemini.api_key' => null]);
    }

    public function test_admin_can_upload_excel_template_and_only_create_unpublished_draft(): void
    {
        $path = base_path('../frontend/public/templates/societyflats-gemini-import-template.xlsx');
        $file = new UploadedFile($path, 'societies.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', null, true);

        $response = $this->withToken('admin-test-token')->post('/api/admin/import/spreadsheet', ['file' => $file], ['Accept' => 'application/json']);
        $response->assertAccepted()->assertJsonPath('data.type', 'bulk_spreadsheet')->assertJsonPath('data.results.0.name', 'DLF The Ultima')->assertJsonPath('data.results.0.city', 'Gurugram');
        $this->withToken('admin-test-token')->getJson('/api/admin/import/jobs?limit=10')->assertOk();

        $this->assertDatabaseHas('societies', ['name' => 'DLF The Ultima', 'city' => 'Gurugram', 'builder' => 'DLF Limited', 'status' => 'Draft', 'verification_status' => 'Needs Review', 'is_published' => false]);
        $this->getJson('/api/societies')->assertOk()->assertJsonPath('data.total', 0);
    }

    public function test_csv_requires_society_name_and_city_headers(): void
    {
        $file = UploadedFile::fake()->createWithContent('bad.csv', "name,builder\nExample Society,Builder");
        $this->withToken('admin-test-token')->post('/api/admin/import/spreadsheet', ['file' => $file], ['Accept' => 'application/json'])->assertUnprocessable()->assertJsonValidationErrors('file');
    }

    public function test_csv_upload_preserves_authoritative_identity_fields(): void
    {
        $csv = "society_name,city,sector,locality,builder,google_maps_url\nExample Heights,Delhi,Sector 9,Central District,Example Builder,https://maps.google.com/example\n";
        $file = UploadedFile::fake()->createWithContent('societies.csv', $csv);
        $this->withToken('admin-test-token')->post('/api/admin/import/spreadsheet', ['file' => $file], ['Accept' => 'application/json'])->assertAccepted();
        $this->withToken('admin-test-token')->getJson('/api/admin/import/jobs?limit=10')->assertOk();
        $this->assertDatabaseHas('societies', ['name' => 'Example Heights', 'city' => 'Delhi', 'sector' => 'Sector 9', 'locality' => 'Central District', 'builder' => 'Example Builder', 'google_maps_url' => 'https://maps.google.com/example', 'is_published' => false]);
    }
}
