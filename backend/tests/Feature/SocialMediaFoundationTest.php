<?php

namespace Tests\Feature;

use App\Models\Lead;
use App\Models\Property;
use App\Models\SocialAccount;
use App\Models\SocialPost;
use App\Models\SocialPostAsset;
use App\Models\SocialPublishLog;
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
            // Claude is now the primary draft generator — blank it so tests exercise the
            // deterministic fallback instead of making real API calls.
            'services.claude.api_key' => '',
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
            'amenities' => ['["Gym","Clubhouse","Swimming Pool","Luxury Lounge","2.5 acre Greens"]', 'Power Backup, Visitor Parking, World-class specifications'],
            'nearby_schools' => json_encode([['name' => 'Top School 1.4 km rating 4.7'], ['name' => 'Aravali Public School']]),
            'nearby_metro' => "Metro Station - 5 minutes away\nDwarka Expressway Transit",
            'nearby_hospitals' => 'Best Hospital Google rating 4.9, Safe Care Hospital',
            'nearby_office_hubs' => '<cite>bad</cite> Cyber Business Park 20 minutes',
            'builder' => 'Godrej Properties Limited',
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

        Lead::create([
            'name' => 'Unsafe Buyer Lead',
            'phone' => '7777777777',
            'email' => 'unsafe-buyer@example.test',
            'budget' => '₹4 Cr',
            'requirement' => 'Buy requirement Preferred time Tomorrow raw message please call',
            'entity_slug' => 'preferred-time-tomorrow',
            'source' => 'Website',
            'source_page' => 'Society page',
            'lead_intent' => 'buyer',
            'notes' => 'admin note with tomorrow visit detail',
            'message' => 'Preferred time Tomorrow. Raw message with mobile number.',
            'created_at' => now(),
        ]);

        $response = $this->admin()->getJson('/api/admin/ai/social/context')->assertOk();
        $json = json_encode($response->json());
        $lowerJson = mb_strtolower($json);

        $this->assertStringContainsString('Published Social Society', $json);
        $this->assertStringNotContainsString('Draft Private Society', $json);
        $this->assertStringNotContainsString('Private Owner', $json);
        $this->assertStringNotContainsString('9999999999', $json);
        $this->assertStringNotContainsString('Private Lead', $json);
        $this->assertStringNotContainsString('lead@example.test', $json);
        $this->assertStringNotContainsString('private lead note', $json);
        $this->assertStringNotContainsString('Unsafe Buyer Lead', $json);
        $this->assertStringNotContainsString('unsafe-buyer@example.test', $json);
        $this->assertStringNotContainsString('Preferred time Tomorrow', $json);
        $this->assertArrayNotHasKey('seo_title', $response->json('data.published_societies_summary.0'));
        $this->assertArrayNotHasKey('seo_description', $response->json('data.published_societies_summary.0'));
        $this->assertDoesNotMatchRegularExpression('/phone|mobile|email|password|token|admin_note|notes|lead_name|owner_phone|owner_email|₹|rs\\.|cr\\b|crore|lac|lakh|rera|possession|ready to move|ready-to-move|rating|google rating|guaranteed|best|number one|lowest|cheapest|investment|return|appreciation|luxury|ultra-luxury|premium|world-class|exclusive|limited|book now|sq\\.ft|sqft|sq m|acre|km|minutes|preferred time|tomorrow|today|raw message|requirement|\\bbhk\\b|\\btowers?\\b|\\bunits?\\b/i', $lowerJson);
        $this->assertJsonStringEqualsJsonString(json_encode(['Gymnasium', 'Clubhouse', 'Swimming Pool', 'Power Backup', 'Parking']), json_encode($response->json('data.published_societies_summary.0.approved_amenities')));
        $this->assertSame(['schools' => 2, 'hospitals' => 2, 'transit' => 2, 'business_hubs' => 1, 'other' => 0], $response->json('data.published_societies_summary.0.nearby_highlights'));
        $this->assertSame('Godrej Properties', $response->json('data.published_societies_summary.0.builder'));
        $this->assertSame('Published society profile by Godrej Properties in Sector 104, Gurugram with approved amenities and a public SocietyFlats page.', $response->json('data.published_societies_summary.0.short_description'));
        $this->assertSame('published-home-1', $response->json('data.published_properties_summary.0.slug'));
        $leadTypeLabels = collect($response->json('data.safe_lead_trend_summary.requested_property_types'))->pluck('label')->all();
        $this->assertContains('rent', $leadTypeLabels);
        $this->assertContains('buy', $leadTypeLabels);
        $this->assertEmpty(array_diff($leadTypeLabels, ['rent', 'buy', 'resale', 'owner_listing', 'tenant_query', 'buyer_query', 'general', 'unknown']));
        $this->assertArrayHasKey('owner_listing_queries_this_week', $response->json('data.safe_lead_trend_summary'));
        $this->assertArrayNotHasKey('owner_queries_this_week', $response->json('data.safe_lead_trend_summary'));
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

    public function test_sm2_meta_oauth_default_url_uses_connect_only_scopes(): void
    {
        $response = $this->admin()->postJson('/api/admin/social/oauth/facebook_page/start')->assertOk();
        $url = $response->json('data.authorization_url');
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
        $scope = (string) ($query['scope'] ?? '');

        $this->assertStringContainsString('pages_show_list', $scope);
        $this->assertStringContainsString('pages_read_engagement', $scope);
        $this->assertStringNotContainsString('email', $scope);
        $this->assertStringNotContainsString('pages_manage_posts', $scope);
        $this->assertStringNotContainsString('pages_manage_engagement', $scope);
        $this->assertStringNotContainsString('instagram_content_publish', $scope);
    }

    public function test_sm2_meta_account_can_connect_with_read_only_scopes(): void
    {
        Http::fake([
            'https://graph.facebook.com/v20.0/oauth/access_token' => Http::response([
                'access_token' => 'meta-read-token',
                'expires_in' => 3600,
                'token_type' => 'Bearer',
                'scope' => 'public_profile,pages_show_list,pages_read_engagement',
            ], 200),
        ]);

        $start = $this->admin()->postJson('/api/admin/social/oauth/facebook_page/start')->assertOk();

        $response = $this->getJson('/api/admin/social/oauth/callback?'.http_build_query([
            'platform' => 'facebook_page',
            'code' => 'oauth-code',
            'state' => $start->json('data.state'),
        ]))->assertOk();

        $json = json_encode($response->json());
        $this->assertStringNotContainsString('meta-read-token', $json);

        $account = SocialAccount::where('platform', 'facebook_page')->firstOrFail();
        $this->assertSame('connected', $account->status);
        $this->assertContains('pages_show_list', $account->scopes);
        $this->assertContains('pages_read_engagement', $account->scopes);
        $this->assertNotContains('pages_manage_posts', $account->scopes);
    }

    public function test_sm2_manual_publish_requires_approval_confirmation_and_connected_account(): void
    {
        $post = SocialPost::create([
            'platform' => 'instagram',
            'post_type' => 'single_post',
            'title' => 'Safe Instagram draft',
            'caption' => 'Neutral approved society update.',
            'risk_level' => 'low',
            'status' => 'needs_approval',
        ]);

        SocialPostAsset::create([
            'social_post_id' => $post->id,
            'asset_type' => 'image',
            'platform' => 'instagram',
            'public_url' => 'https://cdn.example.test/social/image.jpg',
            'status' => 'approved',
            'risk_level' => 'low',
        ]);

        $account = SocialAccount::create([
            'platform' => 'instagram_business',
            'account_name' => 'Instagram Business',
            'account_id' => 'ig-user-1',
            'status' => 'connected',
            'scopes' => ['instagram_content_publish', 'instagram_basic', 'pages_show_list', 'pages_read_engagement'],
            'metadata' => ['instagram_business_account_id' => 'ig-user-1'],
        ]);
        $account->access_token = 'secret-instagram-token';
        $account->save();

        $this->admin()->postJson("/api/admin/social/posts/{$post->id}/publish", [
            'confirm_publish' => true,
            'social_account_id' => $account->id,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Only approved social posts can be manually published.');

        $post->update(['status' => 'approved']);

        $this->admin()->postJson("/api/admin/social/posts/{$post->id}/publish", [
            'social_account_id' => $account->id,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'The confirm publish field must be accepted.');
    }

    public function test_sm2_instagram_manual_publish_saves_external_id_and_audit_log_without_exposing_token(): void
    {
        Http::fake([
            'https://graph.facebook.com/v20.0/ig-user-1/media' => Http::response(['id' => 'container-1'], 200),
            'https://graph.facebook.com/v20.0/ig-user-1/media_publish' => Http::response(['id' => 'ig-post-1'], 200),
        ]);

        $post = SocialPost::create([
            'platform' => 'instagram',
            'post_type' => 'single_post',
            'title' => 'Approved Instagram post',
            'caption' => 'Neutral approved society update.',
            'risk_level' => 'low',
            'status' => 'approved',
        ]);

        SocialPostAsset::create([
            'social_post_id' => $post->id,
            'asset_type' => 'image',
            'platform' => 'instagram',
            'public_url' => 'https://cdn.example.test/social/image.jpg',
            'status' => 'approved',
            'risk_level' => 'low',
        ]);

        $account = SocialAccount::create([
            'platform' => 'instagram_business',
            'account_name' => 'Instagram Business',
            'account_id' => 'ig-user-1',
            'status' => 'connected',
            'scopes' => ['instagram_content_publish', 'instagram_basic', 'pages_show_list', 'pages_read_engagement'],
            'metadata' => ['instagram_business_account_id' => 'ig-user-1'],
        ]);
        $account->access_token = 'secret-instagram-token';
        $account->save();

        $response = $this->admin()->postJson("/api/admin/social/posts/{$post->id}/publish", [
            'confirm_publish' => true,
            'social_account_id' => $account->id,
        ])->assertOk();

        $responseJson = json_encode($response->json());
        $this->assertStringNotContainsString('secret-instagram-token', $responseJson);
        $this->assertDatabaseHas('social_posts', [
            'id' => $post->id,
            'status' => 'published',
            'publish_status' => 'published',
            'external_post_id' => 'ig-post-1',
        ]);
        $this->assertTrue(SocialPublishLog::where('social_post_id', $post->id)->where('status', 'published')->exists());
    }

    public function test_sm2_facebook_publish_is_blocked_without_pages_manage_posts_scope(): void
    {
        $post = SocialPost::create([
            'platform' => 'facebook',
            'post_type' => 'single_post',
            'title' => 'Approved Facebook post',
            'caption' => 'Neutral approved society update.',
            'risk_level' => 'low',
            'status' => 'approved',
        ]);

        $account = SocialAccount::create([
            'platform' => 'facebook_page',
            'account_name' => 'Facebook Page',
            'account_id' => 'page-1',
            'status' => 'connected',
            'scopes' => ['public_profile', 'pages_show_list', 'pages_read_engagement'],
        ]);
        $account->access_token = 'secret-facebook-token';
        $account->save();

        $this->admin()->postJson("/api/admin/social/posts/{$post->id}/publish", [
            'confirm_publish' => true,
            'social_account_id' => $account->id,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Meta publish blocked: required publishing permission is not granted.');

        $this->assertTrue(SocialPublishLog::where('social_post_id', $post->id)->where('status', 'blocked')->exists());
    }

    public function test_sm2_instagram_publish_is_blocked_without_instagram_content_publish_scope(): void
    {
        $post = SocialPost::create([
            'platform' => 'instagram',
            'post_type' => 'single_post',
            'title' => 'Approved Instagram post',
            'caption' => 'Neutral approved society update.',
            'risk_level' => 'low',
            'status' => 'approved',
        ]);

        $account = SocialAccount::create([
            'platform' => 'instagram_business',
            'account_name' => 'Instagram Business',
            'account_id' => 'ig-user-1',
            'status' => 'connected',
            'scopes' => ['public_profile', 'pages_show_list', 'pages_read_engagement'],
            'metadata' => ['instagram_business_account_id' => 'ig-user-1'],
        ]);
        $account->access_token = 'secret-instagram-token';
        $account->save();

        $this->admin()->postJson("/api/admin/social/posts/{$post->id}/publish", [
            'confirm_publish' => true,
            'social_account_id' => $account->id,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Meta publish blocked: required publishing permission is not granted.');

        $this->assertTrue(SocialPublishLog::where('social_post_id', $post->id)->where('status', 'blocked')->exists());
    }

    public function test_sm2_oauth_callback_stores_tokens_encrypted_without_returning_them(): void
    {
        Http::fake([
            'https://www.linkedin.com/oauth/v2/accessToken' => Http::response([
                'access_token' => 'linkedin-secret-token',
                'refresh_token' => 'linkedin-refresh-secret',
                'expires_in' => 3600,
                'token_type' => 'Bearer',
            ], 200),
        ]);

        $start = $this->admin()->postJson('/api/admin/social/oauth/linkedin/start')->assertOk();
        $state = $start->json('data.state');

        $response = $this->getJson('/api/admin/social/oauth/callback?'.http_build_query([
            'code' => 'oauth-code',
            'state' => $state,
        ]))->assertOk();

        $json = json_encode($response->json());
        $this->assertStringNotContainsString('linkedin-secret-token', $json);
        $this->assertStringNotContainsString('linkedin-refresh-secret', $json);

        $account = SocialAccount::where('platform', 'linkedin')->firstOrFail();
        $this->assertSame('connected', $account->status);
        $this->assertNotSame('linkedin-secret-token', $account->access_token_encrypted);
        $this->assertSame('linkedin-secret-token', $account->accessToken());
    }

    public function test_sm2_high_risk_publish_requires_explicit_high_risk_confirmation(): void
    {
        $post = SocialPost::create([
            'platform' => 'linkedin',
            'post_type' => 'single_post',
            'title' => 'High risk draft',
            'caption' => 'Reviewed high risk post.',
            'risk_level' => 'high',
            'status' => 'approved',
        ]);

        $account = SocialAccount::create([
            'platform' => 'linkedin',
            'account_name' => 'LinkedIn',
            'account_id' => 'urn:li:person:abc',
            'status' => 'connected',
        ]);
        $account->access_token = 'secret-linkedin-token';
        $account->save();

        $this->admin()->postJson("/api/admin/social/posts/{$post->id}/publish", [
            'confirm_publish' => true,
            'social_account_id' => $account->id,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'High-risk posts require explicit high-risk confirmation before manual publishing.');
    }

    public function test_sm2_whatsapp_returns_manual_export_and_never_posts(): void
    {
        $post = SocialPost::create([
            'platform' => 'whatsapp',
            'post_type' => 'status',
            'title' => 'WhatsApp status',
            'caption' => 'Manual WhatsApp status copy.',
            'risk_level' => 'low',
            'status' => 'approved',
        ]);

        SocialPostAsset::create([
            'social_post_id' => $post->id,
            'asset_type' => 'creative_brief',
            'platform' => 'whatsapp',
            'public_url' => 'https://cdn.example.test/social/whatsapp.jpg',
            'status' => 'approved',
            'risk_level' => 'low',
        ]);

        $this->admin()->postJson("/api/admin/social/posts/{$post->id}/publish", [
            'confirm_publish' => true,
        ])->assertOk()
            ->assertJsonPath('data.mode', 'manual_export')
            ->assertJsonPath('data.copy', 'Manual WhatsApp status copy.');

        $post->refresh();
        $this->assertSame('manual_export_ready', $post->publish_status);
        $this->assertNull($post->posted_at);
        $this->assertTrue(SocialPublishLog::where('social_post_id', $post->id)->where('action', 'whatsapp_manual_export')->exists());
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
