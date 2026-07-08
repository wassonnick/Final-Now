<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\Property;
use App\Models\SocialAccount;
use App\Models\SocialPost;
use App\Models\SocialPostAsset;
use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SocialMediaFoundationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.admin_api_token' => 'social-admin-token',
            'services.openai.api_key' => null,
            'services.openai.model' => 'gpt-test',
            'services.openai.image_model' => null,
        ]);
    }

    public function test_social_admin_routes_are_protected(): void
    {
        $this->getJson('/api/admin/ai/social/context')->assertUnauthorized();
        $this->postJson('/api/admin/social/generate', [])->assertUnauthorized();
    }

    public function test_context_exposes_only_safe_published_marketing_data(): void
    {
        $published = $this->society([
            'name' => 'Published Social Society',
            'slug' => 'published-social-society',
            'description' => '<p>Best luxury option starting from ₹4.25 Cr with RERA ABC123, possession Dec 2027, ready to move, Google rating 4.8, 1.4 km from metro. <cite>turn0search1</cite> Safe community information.</p>',
            'meta_title' => 'Best Published Social Society from Rs. 4 Cr',
            'meta_description' => 'Guaranteed investment return and appreciation with ready to move homes near transit.',
            'amenities' => ['["Gym","Clubhouse","Swimming Pool"]', 'Power Backup, Visitor Parking'],
            'nearby_schools' => json_encode([['name' => 'Top School 1.4 km rating 4.7'], ['name' => 'Aravali Public School']]),
            'nearby_metro' => "Metro Station - 5 minutes away\nDwarka Expressway Transit",
            'nearby_hospitals' => 'Best Hospital Google rating 4.9, Safe Care Hospital',
            'nearby_office_hubs' => '<cite>bad</cite> Cyber Business Park 20 minutes',
        ]);
        $this->society(['name' => 'Draft Private Society', 'slug' => 'draft-private-society', 'is_published' => false, 'status' => 'Draft']);

        Property::create([
            'society_id' => $published->id,
            'owner_name' => 'Private Owner',
            'owner_phone' => '9999999999',
            'owner_notes' => 'private owner note',
            'title' => 'Published 3 BHK',
            'slug' => 'published-3-bhk',
            'listing_type' => 'Rent',
            'status' => 'Live',
            'society' => $published->name,
            'locality' => $published->sector,
            'price' => 90000,
            'bedrooms' => 3,
            'verified' => true,
            'verified_at' => now(),
            'availability_checked_at' => now(),
            'published_at' => now(),
        ]);

        Lead::create([
            'name' => 'Private Lead',
            'phone' => '8888888888',
            'email' => 'lead@example.test',
            'budget' => '₹80k-₹1L',
            'requirement' => 'rent',
            'entity_slug' => 'sector-104',
            'notes' => 'private lead note',
            'message' => 'private message',
            'created_at' => now(),
        ]);

        $response = $this->admin()->getJson('/api/admin/ai/social/context')->assertOk();
        $json = json_encode($response->json());

        $this->assertStringContainsString('Published Social Society', $json);
        $this->assertStringNotContainsString('Draft Private Society', $json);
        $this->assertStringNotContainsString('Private Owner', $json);
        $this->assertStringNotContainsString('9999999999', $json);
        $this->assertStringNotContainsString('Private Lead', $json);
        $this->assertStringNotContainsString('lead@example.test', $json);
        $this->assertStringNotContainsString('private lead note', $json);
        $this->assertDoesNotMatchRegularExpression('/phone|mobile|email|password|token|admin_note|notes|lead_name|₹|rs\\.?|cr\\b|crore|lac|lakh|rera|possession|ready to move|rating|google rating|guaranteed|best|number one|lowest|cheapest|investment return|appreciation/i', $json);
        $this->assertDoesNotMatchRegularExpression('/\\b\\d+(?:\\.\\d+)?\\s*(?:km|minutes?|mins?)\\b/i', $json);
        $this->assertJsonStringEqualsJsonString(json_encode(['Gym', 'Clubhouse', 'Swimming Pool', 'Power Backup', 'Visitor Parking']), json_encode($response->json('data.published_societies_summary.0.approved_amenities')));
        $this->assertSame(['name' => 'Aravali Public School', 'category' => 'school'], $response->json('data.published_societies_summary.0.nearby_highlights.0'));
    }

    public function test_generator_without_openai_creates_review_only_posts_and_creative_briefs(): void
    {
        $society = $this->society();

        $this->admin()->postJson('/api/admin/social/generate', [
            'platforms' => ['instagram'],
            'content_pillar' => 'society education',
            'objective' => 'Create safe awareness',
            'target_audience' => 'Gurgaon tenants',
            'society_id' => $society->id,
            'number_of_variations' => 2,
            'generate_images' => true,
            'image_style' => 'premium_real_estate',
        ])->assertCreated()
            ->assertJsonPath('data.posts.0.status', 'needs_approval')
            ->assertJsonCount(2, 'data.posts');

        $this->assertDatabaseCount('social_posts', 2);
        $this->assertDatabaseCount('social_post_assets', 2);
        $this->assertTrue(SocialPost::query()->where('status', 'needs_approval')->exists());
        $this->assertTrue(SocialPostAsset::query()->where('asset_type', 'creative_brief')->where('status', 'needs_approval')->exists());
    }

    public function test_ai_high_risk_terms_are_escalated_and_never_auto_approved(): void
    {
        config(['services.openai.api_key' => 'test-openai-key']);
        $society = $this->society();

        Http::fake([
            'https://api.openai.com/*' => Http::response([
                'choices' => [[
                    'message' => [
                        'content' => json_encode([
                            'posts' => [[
                                'platform' => 'instagram',
                                'post_type' => 'single_post',
                                'title' => 'Best premium rent availability',
                                'hook' => 'Guaranteed top investment opportunity',
                                'caption' => 'Ask about price and available homes.',
                                'cta' => 'Request callback',
                                'hashtags' => ['#SocietyFlats'],
                                'creative_prompt' => 'Premium Gurgaon society visual',
                                'image_prompt' => 'Premium Gurgaon society graphic',
                                'source_type' => 'society',
                                'source_id' => $society->id,
                                'risk_level' => 'low',
                            ]],
                        ]),
                    ],
                ]],
            ], 200),
        ]);

        $this->admin()->postJson('/api/admin/social/generate', [
            'platforms' => ['instagram'],
            'content_pillar' => 'conversion',
            'objective' => 'Generate leads',
            'target_audience' => 'buyers',
            'society_id' => $society->id,
            'number_of_variations' => 1,
        ])->assertCreated()
            ->assertJsonPath('data.posts.0.risk_level', 'high')
            ->assertJsonPath('data.posts.0.status', 'needs_approval');

        $this->assertDatabaseHas('social_posts', ['risk_level' => 'high', 'status' => 'needs_approval']);
    }

    public function test_social_accounts_endpoint_does_not_expose_tokens(): void
    {
        SocialAccount::create([
            'platform' => 'instagram_business',
            'account_name' => 'Instagram Business',
            'status' => 'connected',
            'access_token_encrypted' => 'raw-access-token',
            'refresh_token_encrypted' => 'raw-refresh-token',
            'scopes' => ['publish'],
        ]);

        $response = $this->admin()->getJson('/api/admin/social/accounts')->assertOk();
        $json = json_encode($response->json());

        $this->assertStringNotContainsString('access_token_encrypted', $json);
        $this->assertStringNotContainsString('refresh_token_encrypted', $json);
        $this->assertStringNotContainsString('raw-access-token', $json);
        $this->assertStringNotContainsString('raw-refresh-token', $json);
    }

    private function society(array $extra = []): Society
    {
        return Society::create(array_merge([
            'name' => 'Godrej Summit',
            'slug' => 'godrej-summit-gurugram',
            'builder' => 'Godrej Properties',
            'sector' => 'Sector 104',
            'locality' => 'Sector 104',
            'city' => 'Gurugram',
            'state' => 'Haryana',
            'description' => 'Published SocietyFlats society profile for Gurgaon users.',
            'status' => 'Verified',
            'verification_status' => 'Verified',
            'is_published' => true,
            'published_at' => now(),
            'score' => 8.5,
            'amenities' => ['Gym', 'Clubhouse'],
        ], $extra));
    }

    private function admin(): static
    {
        return $this->withHeaders(['Authorization' => 'Bearer social-admin-token']);
    }
}
