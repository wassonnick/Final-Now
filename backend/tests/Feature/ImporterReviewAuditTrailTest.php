<?php

namespace Tests\Feature;

use App\Models\Society;
use App\Models\VerifiedSocietyFieldSource;
use App\Models\VerifiedSocietyImportImage;
use App\Models\VerifiedSocietyImportJob;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ImporterReviewAuditTrailTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
    }

    public function test_field_approve_and_reject_record_reviewer_identity_and_time(): void
    {
        [$society, $job] = $this->draft();
        $approved = $this->field($society, $job, 'builder', 'Imported Builder');
        $rejected = $this->field($society, $job, 'project_status', 'Ready to Move');

        $this->admin('reviewer-a@societyflats.com')
            ->postJson("/api/admin/verified-importer/fields/{$approved->id}/approve")
            ->assertOk();
        $this->admin('reviewer-b@societyflats.com')
            ->postJson("/api/admin/verified-importer/fields/{$rejected->id}/reject", ['review_notes' => 'Wrong source'])
            ->assertOk();

        $approved->refresh();
        $rejected->refresh();
        $this->assertSame('reviewer-a@societyflats.com', $approved->reviewed_by);
        $this->assertNotNull($approved->reviewed_at);
        $this->assertSame('reviewer-b@societyflats.com', $rejected->reviewed_by);
        $this->assertNotNull($rejected->reviewed_at);
    }

    public function test_image_reject_records_reviewer_and_defaults_to_admin_without_header(): void
    {
        [$society, $job] = $this->draft();
        $image = VerifiedSocietyImportImage::create([
            'import_job_id' => $job->id, 'society_id' => $society->id, 'image_type' => 'gallery',
            'source_type' => 'google_photos', 'google_photo_reference' => 'ref-audit-1',
            'sort_order' => 0, 'confidence_score' => 80, 'needs_review' => true,
        ]);

        $this->admin()->postJson("/api/admin/verified-importer/images/{$image->id}/reject")->assertOk();

        $image->refresh();
        $this->assertSame('admin', $image->reviewed_by);
        $this->assertNotNull($image->reviewed_at);
        $this->assertTrue($image->admin_rejected);
    }

    /** @return array{0: Society, 1: VerifiedSocietyImportJob} */
    private function draft(): array
    {
        $society = Society::create([
            'name' => 'Audit Trail Society', 'slug' => 'audit-trail-society', 'builder' => null,
            'sector' => 'Sector 65', 'locality' => 'Sector 65', 'city' => 'Gurugram', 'state' => 'Haryana',
            'description' => 'Draft under review.', 'status' => 'Draft', 'verification_status' => 'Needs Review',
            'is_published' => false, 'score' => 7.5, 'source_name' => 'Verified Society Importer V2',
        ]);
        $job = VerifiedSocietyImportJob::create(['job_type' => 'single', 'status' => 'needs_review', 'total_rows' => 1, 'processed_rows' => 1]);

        return [$society, $job];
    }

    private function field(Society $society, VerifiedSocietyImportJob $job, string $name, string $value): VerifiedSocietyFieldSource
    {
        return VerifiedSocietyFieldSource::create([
            'import_job_id' => $job->id, 'society_id' => $society->id, 'field_name' => $name,
            'field_value' => $value, 'raw_value' => $value, 'normalized_value' => $value,
            'source_type' => 'google_places', 'source_name' => 'Test source', 'confidence_score' => 70,
            'is_selected_value' => true, 'needs_review' => true, 'admin_approved' => false, 'admin_rejected' => false,
        ]);
    }

    private function admin(?string $email = null): static
    {
        $headers = ['X-Admin-Token' => 'admin-test-token'];
        if ($email) $headers['X-Admin-Email'] = $email;

        return $this->withHeaders($headers);
    }
}
