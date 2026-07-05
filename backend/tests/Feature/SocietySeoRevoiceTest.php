<?php

namespace Tests\Feature;

use App\Models\Society;
use App\Models\SocietySeoContent;
use App\Services\Seo\SocietySeoRevoiceService;
use App\Services\SocietySeoAiDraftService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SocietySeoRevoiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
    }

    public function test_revoice_parks_a_draft_without_touching_the_live_published_copy(): void
    {
        [$society, $content] = $this->publishedSociety();

        $this->mockAi(['seo_h1' => 'Warm new H1', 'intro_summary' => 'Warm new intro.']);

        app(SocietySeoRevoiceService::class)->generateForSociety($society);

        $fresh = $content->fresh();
        // Live columns and status are untouched — the public page still serves the old copy.
        $this->assertSame('Old published H1', $fresh->seo_h1);
        $this->assertSame('published', $fresh->status);
        // The regenerated copy is parked for review.
        $this->assertSame('Warm new H1', data_get($fresh->revoice_draft, 'seo_h1'));
        $this->assertNotNull($fresh->revoice_generated_at);
    }

    public function test_approve_merges_the_draft_into_live_copy_and_republishes(): void
    {
        [$society, $content] = $this->publishedSociety(['revoice_draft' => $this->completeDraft(['seo_h1' => 'Approved warm H1']), 'revoice_generated_at' => now()]);

        $this->admin()->postJson("/api/admin/societies/{$society->id}/seo-content/revoice/approve")
            ->assertOk()
            ->assertJsonPath('data.seo_h1', 'Approved warm H1')
            ->assertJsonPath('data.status', 'published');

        $fresh = $content->fresh();
        $this->assertSame('Approved warm H1', $fresh->seo_h1);
        $this->assertNull($fresh->revoice_draft);
        $this->assertNotNull($fresh->published_at);
    }

    public function test_reject_discards_the_draft_and_leaves_live_copy_unchanged(): void
    {
        [$society, $content] = $this->publishedSociety(['revoice_draft' => $this->completeDraft(['seo_h1' => 'Rejected H1']), 'revoice_generated_at' => now()]);

        $this->admin()->postJson("/api/admin/societies/{$society->id}/seo-content/revoice/reject")
            ->assertOk()
            ->assertJsonPath('data.seo_h1', 'Old published H1');

        $fresh = $content->fresh();
        $this->assertNull($fresh->revoice_draft);
        $this->assertSame('Old published H1', $fresh->seo_h1);
    }

    public function test_pending_listing_and_guards(): void
    {
        [$society] = $this->publishedSociety(['revoice_draft' => $this->completeDraft(['seo_h1' => 'Pending H1']), 'revoice_generated_at' => now()]);
        [$other] = $this->publishedSociety([], 'Other Society', 'other-society'); // no pending draft

        $this->getJson('/api/admin/societies/seo-content/revoice-pending')->assertUnauthorized();

        $this->admin()->getJson('/api/admin/societies/seo-content/revoice-pending')
            ->assertOk()
            ->assertJsonPath('data.0.society_id', $society->id)
            ->assertJsonCount(1, 'data');

        // Approving with no pending draft fails cleanly.
        $this->admin()->postJson("/api/admin/societies/{$other->id}/seo-content/revoice/approve")->assertStatus(422);
    }

    public function test_service_skips_societies_without_published_content(): void
    {
        $society = Society::create(['name' => 'Draft Co', 'slug' => 'draft-co', 'city' => 'Gurugram', 'status' => 'Draft', 'verification_status' => 'Needs Review', 'is_published' => false, 'score' => 7, 'description' => 'x']);
        SocietySeoContent::create(['society_id' => $society->id, 'status' => 'draft', 'generated_by' => 'ai', 'seo_h1' => 'Draft H1']);

        $this->mockAiNeverCalled();
        $result = app(SocietySeoRevoiceService::class)->generateForSociety($society);
        $this->assertNull($result);
    }

    /** @return array{0:Society,1:SocietySeoContent} */
    private function publishedSociety(array $contentOverrides = [], string $name = 'SEO Test Society', string $slug = 'seo-test-society'): array
    {
        $society = Society::create([
            'name' => $name, 'slug' => $slug, 'city' => 'Gurugram',
            'status' => 'Verified', 'verification_status' => 'Verified', 'is_published' => true, 'published_at' => now(), 'score' => 8,
            'description' => 'Legacy society description',
        ]);
        $content = SocietySeoContent::create(array_merge([
            'society_id' => $society->id, 'status' => 'published', 'generated_by' => 'ai', 'published_at' => now()->subDay(),
            'seo_title' => 'Old title', 'seo_description' => 'Old description', 'seo_h1' => 'Old published H1',
            'intro_summary' => 'Old intro.',
        ], $contentOverrides));

        return [$society, $content];
    }

    private function completeDraft(array $overrides = []): array
    {
        return array_merge([
            'seo_title' => 'New title', 'seo_description' => 'New description', 'seo_h1' => 'New H1',
            'intro_summary' => 'New intro.', 'about_content' => 'New about.',
        ], $overrides);
    }

    private function mockAi(array $content): void
    {
        $this->mock(SocietySeoAiDraftService::class, function ($mock) use ($content) {
            $mock->shouldReceive('generate')->andReturn(['content' => $this->completeDraft($content), 'warnings' => [], 'provider' => 'claude']);
        });
    }

    private function mockAiNeverCalled(): void
    {
        $this->mock(SocietySeoAiDraftService::class, function ($mock) {
            $mock->shouldNotReceive('generate');
        });
    }

    private function admin()
    {
        return $this->withHeaders(['X-Admin-Token' => 'admin-test-token']);
    }
}
