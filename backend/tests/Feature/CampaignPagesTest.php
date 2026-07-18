<?php

namespace Tests\Feature;

use App\Models\CampaignPage;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CampaignPagesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
    }

    private function payload(): array
    {
        return [
            'badge' => 'For NRI owners',
            'titlePlain' => 'Your Gurgaon flat,',
            'titleGold' => 'managed from anywhere.',
            'subtitle' => 'List and let verified seekers reach you wherever you are.',
            'bullets' => [['title' => 'Verified only', 'text' => 'Every enquiry checked.']],
            'steps' => [['title' => 'Tell us', 'text' => 'Five minutes.']],
            'faq' => [['question' => 'Free?', 'answer' => 'Yes.']],
            'primaryCta' => ['label' => 'Start free', 'href' => '/sell'],
            'whatsappText' => 'Hi SocietyFlats, NRI owner here.',
            'leadSource' => 'campaign_nri_owners',
            'seo' => ['title' => 'NRI Owners | SocietyFlats', 'description' => 'List from anywhere.'],
        ];
    }

    public function test_admin_creates_publishes_and_public_fetches_campaign(): void
    {
        $this->withToken('admin-test-token')
            ->postJson('/api/admin/campaigns', ['slug' => 'NRI Owners!', 'payload' => $this->payload()])
            ->assertCreated()
            ->assertJsonPath('data.slug', 'nri-owners')
            ->assertJsonPath('data.status', 'draft');

        $page = CampaignPage::firstOrFail();

        // Draft is invisible publicly.
        $this->getJson('/api/campaigns/nri-owners')->assertNotFound();

        $this->withToken('admin-test-token')
            ->patchJson("/api/admin/campaigns/{$page->id}", ['status' => 'published'])
            ->assertOk()
            ->assertJsonPath('data.status', 'published');

        $this->getJson('/api/campaigns/nri-owners')
            ->assertOk()
            ->assertJsonPath('data.slug', 'nri-owners')
            ->assertJsonPath('data.titleGold', 'managed from anywhere.')
            ->assertJsonPath('data.primaryCta.href', '/sell');

        // Unpublish hides it again.
        $this->withToken('admin-test-token')->patchJson("/api/admin/campaigns/{$page->id}", ['status' => 'draft'])->assertOk();
        $this->getJson('/api/campaigns/nri-owners')->assertNotFound();
    }

    public function test_duplicate_slug_and_invalid_payload_rejected(): void
    {
        $this->withToken('admin-test-token')->postJson('/api/admin/campaigns', ['slug' => 'x-camp', 'payload' => $this->payload()])->assertCreated();
        $this->withToken('admin-test-token')->postJson('/api/admin/campaigns', ['slug' => 'x-camp', 'payload' => $this->payload()])->assertStatus(422);

        $bad = $this->payload();
        $bad['primaryCta']['href'] = 'https://evil.example.com';
        $this->withToken('admin-test-token')->postJson('/api/admin/campaigns', ['slug' => 'y-camp', 'payload' => $bad])->assertStatus(422);
    }
}
