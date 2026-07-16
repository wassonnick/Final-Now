<?php

namespace Tests\Feature;

use App\Models\Society;
use App\Models\SocietySeoContent;
use App\Models\Property;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
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

    public function test_public_society_only_exposes_published_seo_content(): void
    {
        $society = $this->society();
        $society->update(['status' => 'Verified', 'is_published' => true]);
        $content = SocietySeoContent::create([
            'society_id' => $society->id,
            'status' => 'needs_review',
            'seo_title' => 'Private draft title',
        ]);

        $this->getJson("/api/societies/{$society->slug}")
            ->assertOk()
            ->assertJsonPath('data.seo_content', null);

        $content->update(['status' => 'published', 'published_at' => now()]);

        $this->getJson("/api/societies/{$society->slug}")
            ->assertOk()
            ->assertJsonPath('data.seo_content.seo_title', 'Private draft title')
            ->assertJsonPath('data.seo_content.status', 'published');
    }

    public function test_ai_generation_is_review_only_and_refuses_to_overwrite_published_content(): void
    {
        config(['services.ai_import_provider' => 'gemini', 'services.gemini.api_key' => 'test-key']);
        $aiPayload = array_merge($this->completePayload(), [
            'nearby_highlights_json' => [['category' => 'Schools', 'highlights' => ['Example School — 1 km']]],
            'internal_link_suggestions_json' => [['anchor' => 'Sector guide', 'path' => '/gurgaon/sector-104']],
        ]);
        Http::fake(['https://generativelanguage.googleapis.com/*' => Http::response([
            'candidates' => [['content' => ['parts' => [['text' => json_encode($aiPayload)]]]]],
        ])]);
        $society = $this->society();
        $society->update(['status' => 'Verified', 'is_published' => true]);
        Property::create([
            'society_id' => $society->id,
            'title' => 'Published SEO context home',
            'slug' => 'published-seo-context-home',
            'listing_type' => 'Rent',
            'status' => 'Live',
            'verified' => true,
            'verified_at' => now(),
            'availability_checked_at' => now(),
            'published_at' => now(),
        ]);

        $this->admin()->postJson("/api/admin/societies/{$society->id}/seo-content/generate-ai-draft")
            ->assertOk()
            ->assertJsonPath('data.status', 'needs_review')
            ->assertJsonPath('data.generated_by', 'ai')
            ->assertJsonPath('data.nearby_highlights_json.0', 'Schools: Example School — 1 km')
            ->assertJsonPath('data.internal_link_suggestions_json.0.label', 'Sector guide')
            ->assertJsonPath('data.internal_link_suggestions_json.0.url', '/gurgaon/sector-104')
            ->assertJsonPath('data.published_at', null);

        Http::assertSent(function ($request) {
            $prompt = (string) data_get($request->data(), 'contents.0.parts.0.text', '');

            return str_contains($prompt, '"published_inventory_count":1');
        });

        $content = $society->seoContent()->firstOrFail();
        $content->update(['status' => 'published', 'published_at' => now()]);

        $this->admin()->postJson("/api/admin/societies/{$society->id}/seo-content/generate-ai-draft", ['confirm_replace' => true])
            ->assertConflict();
    }

    public function test_ai_route_fails_cleanly_when_provider_is_not_configured(): void
    {
        config(['services.ai_import_provider' => 'gemini', 'services.gemini.api_key' => '']);
        $society = $this->society();

        $this->admin()->postJson("/api/admin/societies/{$society->id}/seo-content/generate-ai-draft")
            ->assertUnprocessable()
            ->assertJsonPath('status', 'error');
    }

    public function test_bulk_report_handles_empty_database(): void
    {
        $this->admin()->getJson('/api/admin/societies/seo-content/report')
            ->assertOk()
            ->assertJsonPath('summary.total_societies', 0)
            ->assertJsonCount(0, 'data');
    }

    public function test_bulk_generation_skips_published_content_and_never_publishes_generated_drafts(): void
    {
        config(['services.ai_import_provider' => 'gemini', 'services.gemini.api_key' => 'test-key']);
        Http::fake(['https://generativelanguage.googleapis.com/*' => Http::response([
            'candidates' => [['content' => ['parts' => [['text' => json_encode($this->completePayload())]]]]],
        ])]);
        $publishedSociety = $this->society();
        $publishedSociety->seoContent()->create(['status' => 'published', 'published_at' => now(), 'seo_title' => 'Keep me']);
        $draftSociety = Society::create(['name' => 'Bulk Draft Society', 'slug' => 'bulk-draft-society', 'city' => 'Gurugram', 'status' => 'Draft', 'score' => 7]);

        $this->admin()->postJson('/api/admin/societies/seo-content/bulk-generate-drafts', ['limit' => 10])
            ->assertOk()
            ->assertJsonPath('summary.already_published', 1)
            ->assertJsonPath('summary.drafts_generated', 1);

        $this->assertSame('published', $publishedSociety->seoContent()->firstOrFail()->status);
        $this->assertSame('needs_review', $draftSociety->seoContent()->firstOrFail()->status);
        $this->assertNull($draftSociety->seoContent()->firstOrFail()->published_at);
    }

    public function test_ai_generation_targets_real_search_console_queries(): void
    {
        // The writer must receive what people ACTUALLY search for this society (GSC queries +
        // mapped keywords) so titles and sections answer live demand, not generic phrasing.
        config(['services.ai_import_provider' => 'gemini', 'services.gemini.api_key' => 'test-key']);
        Http::fake(['https://generativelanguage.googleapis.com/*' => Http::response([
            'candidates' => [['content' => ['parts' => [['text' => json_encode($this->completePayload())]]]]],
        ])]);

        $society = $this->society();
        $page = \App\Models\SeoPage::create([
            'page_key' => 'society:'.$society->id, 'page_type' => 'society',
            'url' => '/society/'.$society->slug, 'canonical_url' => '/society/'.$society->slug,
            'is_public' => true, 'is_indexable' => true,
        ]);
        \App\Models\SeoSearchConsoleMetric::create([
            'seo_page_id' => $page->id, 'metric_date' => now()->subDays(3)->toDateString(),
            'page_url' => '/society/'.$society->slug, 'query' => 'tulip crimson rent 3bhk',
            'clicks' => 12, 'impressions' => 480, 'ctr' => 0.025, 'position' => 8.4,
        ]);
        \App\Models\SeoKeyword::create([
            'keyword' => 'tulip crimson sector 70 review', 'cluster_type' => 'society',
            'intent' => 'research', 'seo_page_id' => $page->id, 'source' => 'seed', 'status' => 'mapped',
        ]);

        $this->admin()->postJson("/api/admin/societies/{$society->id}/seo-content/generate-ai-draft")->assertOk();

        Http::assertSent(function ($request) {
            $body = (string) $request->body();

            return str_contains($body, 'TARGET SEARCH QUERIES')
                && str_contains($body, 'tulip crimson rent 3bhk')
                && str_contains($body, 'tulip crimson sector 70 review');
        });
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
