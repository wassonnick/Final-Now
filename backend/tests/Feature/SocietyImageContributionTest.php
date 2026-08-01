<?php

namespace Tests\Feature;

use App\Models\Society;
use App\Models\SocietyImageContribution;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class SocietyImageContributionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
        Storage::fake(config('filesystems.uploads_disk', 'public'));
    }

    private function society(): Society
    {
        return Society::create([
            'name' => 'Godrej Vrikshya',
            'slug' => 'godrej-vrikshya-gurugram',
            'builder' => 'Godrej Properties',
            'sector' => 'Sector 103',
            'city' => 'Gurugram',
            'status' => 'Verified',
            'is_published' => true,
            'image_status' => 'placeholder',
            'image_approved_by_admin' => false,
        ]);
    }

    private function contribute(Society $society, array $overrides = [])
    {
        return $this->postJson("/api/societies/{$society->slug}/image-contributions", array_merge([
            'image' => UploadedFile::fake()->image('tower.jpg', 1600, 1000),
            'contributor_role' => 'resident',
            'contributor_name' => 'A Resident',
            'contributor_email' => 'resident@example.com',
            'caption' => 'Main entrance',
            'rights_granted' => true,
        ], $overrides));
    }

    /** The grant is the whole point: it is recorded verbatim, at the moment it is given. */
    public function test_a_contribution_records_who_granted_the_right_and_what_they_agreed_to(): void
    {
        $society = $this->society();

        $this->contribute($society)->assertCreated();

        $contribution = SocietyImageContribution::firstOrFail();
        $this->assertSame('pending', $contribution->status);
        $this->assertTrue($contribution->rights_granted);
        $this->assertNotNull($contribution->rights_granted_at);
        $this->assertSame(SocietyImageContribution::ROLES['resident'], $contribution->rights_statement);
        $this->assertSame(1600, $contribution->width);
        Storage::disk(config('filesystems.uploads_disk', 'public'))->assertExists($contribution->image_path);
    }

    /** Without the grant there is nothing to publish on, so the upload must not be accepted. */
    public function test_an_upload_without_a_rights_grant_is_refused(): void
    {
        $society = $this->society();

        $this->contribute($society, ['rights_granted' => false])
            ->assertStatus(422)
            ->assertJsonValidationErrors('rights_granted');

        $this->assertSame(0, SocietyImageContribution::count());
    }

    /** Nothing a contributor sends is public until an admin says so. */
    public function test_a_pending_contribution_does_not_touch_the_society(): void
    {
        $society = $this->society();
        $this->contribute($society)->assertCreated();

        $society->refresh();
        $this->assertSame('placeholder', $society->image_status);
        $this->assertFalse((bool) $society->image_approved_by_admin);
        $this->assertNull($society->cover_image);
    }

    /**
     * Approval maps the contributor's standing onto a status the public site renders, and
     * records which ground the right rests on rather than a generic "approved".
     */
    public function test_approving_publishes_the_cover_and_records_how_the_right_was_obtained(): void
    {
        $society = $this->society();
        $this->contribute($society, ['contributor_role' => 'builder', 'contributor_name' => 'Godrej Rep'])->assertCreated();

        $contribution = SocietyImageContribution::firstOrFail();

        $this->withToken('admin-test-token')
            ->postJson("/api/admin/image-contributions/{$contribution->id}/approve", ['as_cover' => true])
            ->assertOk();

        $society->refresh();
        $this->assertSame('developer_permission_received', $society->image_status);
        $this->assertTrue((bool) $society->image_approved_by_admin);
        $this->assertNotEmpty($society->cover_image);
        $this->assertSame('Provided by the developer', $society->image_credit);
        // A stale Places reference would otherwise keep the society on the proxy.
        $this->assertNull($society->image_photo_reference);

        $this->assertSame('approved', $contribution->fresh()->status);
    }

    /** A resident's own photo is publishable on different grounds than a developer's. */
    public function test_a_resident_photo_publishes_as_self_shot(): void
    {
        $society = $this->society();
        $this->contribute($society)->assertCreated();

        $contribution = SocietyImageContribution::firstOrFail();
        $this->withToken('admin-test-token')
            ->postJson("/api/admin/image-contributions/{$contribution->id}/approve", ['as_cover' => true])
            ->assertOk();

        $this->assertSame('self_shot_uploaded', $society->fresh()->image_status);
        $this->assertSame('Provided by a resident', $society->fresh()->image_credit);
    }

    public function test_rejecting_leaves_the_society_untouched(): void
    {
        $society = $this->society();
        $this->contribute($society)->assertCreated();
        $contribution = SocietyImageContribution::firstOrFail();

        $this->withToken('admin-test-token')
            ->postJson("/api/admin/image-contributions/{$contribution->id}/reject", ['review_notes' => 'Shows people.'])
            ->assertOk();

        $this->assertSame('rejected', $contribution->fresh()->status);
        $this->assertSame('placeholder', $society->fresh()->image_status);
    }

    public function test_the_admin_queue_lists_pending_work_with_counts(): void
    {
        $society = $this->society();
        $this->contribute($society)->assertCreated();

        $response = $this->withToken('admin-test-token')->getJson('/api/admin/image-contributions')->assertOk();

        $this->assertSame(1, $response->json('counts.pending'));
        $this->assertSame('Godrej Vrikshya', $response->json('contributions.0.society.name'));
        $this->assertNotEmpty($response->json('contributions.0.image_url'));
    }

    /** The upload form has to render the exact wording each role will be held to. */
    public function test_the_role_statements_are_published_for_the_form(): void
    {
        $roles = $this->getJson('/api/society-image-contributions/roles')->assertOk()->json('roles');

        $this->assertCount(4, $roles);
        $this->assertSame('resident', $roles[0]['role']);
        $this->assertStringContainsString('permission to publish', $roles[0]['statement']);
        // Staff uploads belong to the admin surface, not the public form.
        $this->assertNotContains('staff', array_column($roles, 'role'));
    }
}
