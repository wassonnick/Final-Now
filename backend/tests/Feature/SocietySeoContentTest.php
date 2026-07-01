<?php

namespace Tests\Feature;

use App\Models\Society;
use App\Models\SocietySeoContent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SocietySeoContentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
    }

    public function test_seo_content_routes_are_admin_only(): void
    {
        $society = $this->society();
        $this->getJson("/api/admin/societies/{$society->id}/seo-content")->assertUnauthorized();
        $this->postJson("/api/admin/societies/{$society->id}/seo-content", [])->assertUnauthorized();
    }

    public function test_admin_can_save_score_approve_publish_and_unpublish_content(): void
    {
        $society = $this->society();
        $payload = $this->completePayload();

        $this->admin()->postJson("/api/admin/societies/{$society->id}/seo-content", $payload)
            ->assertCreated()
            ->assertJsonPath('data.status', 'draft')
            ->assertJsonPath('data.content_score', 100)
            ->assertJsonPath('data.score_label', 'SEO Ready');

        $this->admin()->postJson("/api/admin/societies/{$society->id}/seo-content/publish")
            ->assertUnprocessable();

        $this->admin()->postJson("/api/admin/societies/{$society->id}/seo-content/approve")
            ->assertOk()->assertJsonPath('data.status', 'approved');

        $this->admin()->postJson("/api/admin/societies/{$society->id}/seo-content/publish")
            ->assertOk()->assertJsonPath('data.status', 'published');

        $this->admin()->postJson("/api/admin/societies/{$society->id}/seo-content/unpublish")
            ->assertOk()->assertJsonPath('data.status', 'unpublished');

        $this->assertDatabaseHas('society_seo_contents', ['society_id' => $society->id, 'content_score' => 100]);
    }

    public function test_editing_approved_content_returns_it_to_review_without_touching_society_description(): void
    {
        $society = $this->society();
        SocietySeoContent::create(['society_id' => $society->id, 'status' => 'approved', 'about_content' => 'Old copy']);

        $this->admin()->patchJson("/api/admin/societies/{$society->id}/seo-content", ['about_content' => 'New reviewed draft'])
            ->assertOk()->assertJsonPath('data.status', 'needs_review');

        $this->assertSame('Legacy society description', $society->fresh()->description);
    }

    private function society(): Society
    {
        return Society::create([
            'name' => 'SEO Test Society', 'slug' => 'seo-test-society', 'city' => 'Gurugram',
            'status' => 'Draft', 'verification_status' => 'Needs Review', 'is_published' => false, 'score' => 7,
            'description' => 'Legacy society description',
        ]);
    }

    private function completePayload(): array
    {
        return [
            'seo_title' => 'SEO Test Society Gurgaon', 'seo_description' => 'A factual society guide.',
            'seo_h1' => 'SEO Test Society in Gurgaon', 'intro_summary' => 'A concise introduction.',
            'about_content' => 'About content.', 'location_content' => 'Location content.',
            'rent_content' => 'Rent content.', 'sale_content' => 'Sale content.',
            'amenities_content' => 'Amenities content.', 'investment_content' => 'Investment content.',
            'faq_json' => collect(range(1, 5))->map(fn ($i) => ['question' => "Question {$i}?", 'answer' => "Answer {$i}."])->all(),
            'internal_link_suggestions_json' => [['label' => 'Other society', 'url' => '/society/other']],
            'schema_json' => ['@type' => 'WebPage'],
        ];
    }

    private function admin()
    {
        return $this->withHeaders(['X-Admin-Token' => 'admin-test-token']);
    }
}
