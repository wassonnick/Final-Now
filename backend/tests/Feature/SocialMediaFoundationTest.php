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
        $this->getJson('/api/admin/social/meta/publish-review-url')->assertUnauthorized();
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
        $this->assertStringContainsString('business_management', $scope);
        $this->assertStringNotContainsString('email', $scope);
        $this->assertStringNotContainsString('pages_manage_posts', $scope);
        $this->assertStringNotContainsString('pages_manage_engagement', $scope);
        $this->assertStringNotContainsString('instagram_content_publish', $scope);
    }

    public function test_sm2_meta_publish_review_url_requests_only_the_valid_facebook_publish_scope(): void
    {
        $response = $this->admin()->getJson('/api/admin/social/meta/publish-review-url')
            ->assertOk()
            ->assertJsonPath('data.mode', 'publish_review')
            ->assertJsonPath('data.platform', 'meta')
            ->assertJsonPath('data.redirect_uri', 'https://final-now.onrender.com/api/admin/social/oauth/callback');

        $url = $response->json('data.authorization_url');
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);
        $scope = (string) ($query['scope'] ?? '');
        $state = (string) ($query['state'] ?? '');

        // Facebook publishing works with pages_manage_posts alone. instagram_content_publish is
        // NOT bundled by default — Meta rejects the whole dialog when that scope isn't enabled
        // on the app yet, which used to block Facebook too. It's added back via env once ready.
        $this->assertStringContainsString('pages_manage_posts', $scope);
        $this->assertStringNotContainsString('instagram_content_publish', $scope);
        $this->assertStringNotContainsString('pages_show_list', $scope);
        $this->assertStringNotContainsString('business_management', $scope);
        $this->assertStringNotContainsString('email', $scope);
        $this->assertStringContainsString('.', $state);

        $account = SocialAccount::where('platform', 'facebook_page')->firstOrFail();
        $this->assertSame('publish_review', data_get($account->metadata, 'oauth_mode'));
        $this->assertSame($state, $account->oauth_state);
    }

    public function test_sm2_facebook_publish_scope_can_be_extended_with_instagram_via_env(): void
    {
        // Once the Meta app has the Instagram product enabled, appending the IG scope to the
        // Facebook publish env re-enables Instagram publishing through the same Page dialog.
        config(['services.social_oauth.meta_fb_publish_scopes' => 'pages_manage_posts,instagram_content_publish']);

        $scope = app(\App\Services\Social\SocialOAuthService::class)->scopes('facebook_page', 'publish_review');

        $this->assertContains('pages_manage_posts', $scope);
        $this->assertContains('instagram_content_publish', $scope);
    }

    public function test_sm2_meta_publish_review_callback_stores_publish_scopes_without_overwriting_assets(): void
    {
        Http::fake([
            'https://graph.facebook.com/v20.0/oauth/access_token' => Http::response([
                'access_token' => 'meta-publish-token',
                'expires_in' => 3600,
                'token_type' => 'Bearer',
                'scope' => 'pages_manage_posts,instagram_content_publish',
            ], 200),
        ]);

        $facebook = SocialAccount::create([
            'platform' => 'facebook_page',
            'account_name' => 'Society Flats',
            'account_id' => '275936888926097',
            'status' => 'connected_manual_page',
            'metadata' => ['publish_enabled' => false, 'sm1a_placeholder' => false],
        ]);
        $instagram = SocialAccount::create([
            'platform' => 'instagram_business',
            'account_name' => 'societyflats',
            'account_handle' => 'societyflats',
            'account_id' => '17841461958211646',
            'status' => 'connected_manual_page',
            'metadata' => ['publish_enabled' => false, 'sm1a_placeholder' => false],
        ]);

        $start = $this->admin()->getJson('/api/admin/social/meta/publish-review-url')->assertOk();
        $state = $start->json('data.state');

        $response = $this->getJson('/api/admin/social/oauth/callback?'.http_build_query([
            'code' => 'oauth-code',
            'state' => $state,
        ]))->assertOk();

        $facebook->refresh();
        $instagram->refresh();

        $this->assertSame('Society Flats', $facebook->account_name);
        $this->assertSame('275936888926097', $facebook->account_id);
        $this->assertSame('connected', $facebook->status);
        $this->assertContains('pages_manage_posts', $facebook->scopes);
        $this->assertTrue((bool) data_get($facebook->metadata, 'facebook_publish_scope_granted'));
        $this->assertTrue((bool) data_get($facebook->metadata, 'publish_enabled'));

        $this->assertSame('societyflats', $instagram->account_handle);
        $this->assertSame('17841461958211646', $instagram->account_id);
        $this->assertSame('connected', $instagram->status);
        $this->assertContains('instagram_content_publish', $instagram->scopes);
        $this->assertTrue((bool) data_get($instagram->metadata, 'instagram_publish_scope_granted'));
        $this->assertTrue((bool) data_get($instagram->metadata, 'publish_enabled'));

        $json = json_encode($response->json());
        $this->assertStringNotContainsString('meta-publish-token', $json);
        $this->assertStringNotContainsString('access_token', $json);
    }

    public function test_sm2_meta_publish_review_callback_keeps_publish_disabled_when_scopes_not_granted(): void
    {
        Http::fake([
            'https://graph.facebook.com/v20.0/oauth/access_token' => Http::response([
                'access_token' => 'meta-connect-token',
                'expires_in' => 3600,
                'token_type' => 'Bearer',
                'scope' => 'public_profile',
            ], 200),
        ]);

        $facebook = SocialAccount::create([
            'platform' => 'facebook_page',
            'account_name' => 'Society Flats',
            'account_id' => '275936888926097',
            'status' => 'connected_manual_page',
            'metadata' => ['publish_enabled' => false],
        ]);

        $start = $this->admin()->getJson('/api/admin/social/meta/publish-review-url')->assertOk();

        $this->getJson('/api/admin/social/oauth/callback?'.http_build_query([
            'code' => 'oauth-code',
            'state' => $start->json('data.state'),
        ]))->assertOk();

        $facebook->refresh();
        $instagram = SocialAccount::where('platform', 'instagram_business')->firstOrFail();

        $this->assertSame('connected_manual_page', $facebook->status);
        $this->assertFalse((bool) data_get($facebook->metadata, 'publish_enabled'));
        $this->assertFalse((bool) data_get($facebook->metadata, 'facebook_publish_scope_granted'));
        $this->assertSame('Meta publish permission not granted yet.', $facebook->last_error);
        $this->assertFalse((bool) data_get($instagram->metadata, 'publish_enabled'));
        $this->assertFalse((bool) data_get($instagram->metadata, 'instagram_publish_scope_granted'));
        $this->assertSame('Meta publish permission not granted yet.', $instagram->last_error);
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
            'https://graph.facebook.com/v20.0/me/accounts*' => Http::response([
                'data' => [[
                    'id' => 'page-1',
                    'name' => 'Society Flats',
                    'username' => 'societyflats',
                ]],
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
        $this->assertSame('Society Flats', $account->account_name);
        $this->assertSame('page-1', $account->account_id);
        $this->assertSame('societyflats', $account->account_handle);
        $this->assertContains('pages_show_list', $account->scopes);
        $this->assertContains('pages_read_engagement', $account->scopes);
        $this->assertNotContains('pages_manage_posts', $account->scopes);
        $this->assertFalse((bool) data_get($account->metadata, 'sm1a_placeholder'));
    }

    public function test_sm2_meta_oauth_requires_page_selection_when_multiple_pages_returned(): void
    {
        Http::fake([
            'https://graph.facebook.com/v20.0/oauth/access_token' => Http::response([
                'access_token' => 'meta-read-token',
                'expires_in' => 3600,
                'token_type' => 'Bearer',
                'scope' => 'public_profile,pages_show_list,pages_read_engagement',
            ], 200),
            'https://graph.facebook.com/v20.0/me/accounts*' => Http::response([
                'data' => [
                    ['id' => 'page-1', 'name' => 'Society Flats', 'username' => 'societyflats'],
                    ['id' => 'page-2', 'name' => 'Other Page', 'username' => 'otherpage'],
                ],
            ], 200),
        ]);

        $start = $this->admin()->postJson('/api/admin/social/oauth/facebook_page/start')->assertOk();

        $this->getJson('/api/admin/social/oauth/callback?'.http_build_query([
            'platform' => 'facebook_page',
            'code' => 'oauth-code',
            'state' => $start->json('data.state'),
        ]))->assertOk();

        $account = SocialAccount::where('platform', 'facebook_page')->firstOrFail();
        $this->assertSame('pending_page_selection', $account->status);
        $this->assertNull($account->account_id);
        $this->assertSame(2, data_get($account->metadata, 'available_pages_count'));
        $this->assertCount(2, data_get($account->metadata, 'available_pages'));

        $responseJson = json_encode($this->admin()->getJson('/api/admin/social/accounts')->json());
        $this->assertStringNotContainsString('meta-read-token', $responseJson);

        $this->admin()->postJson('/api/admin/social/oauth/meta/select-page', [
            'page_id' => 'page-2',
        ])->assertOk();

        $account->refresh();
        $this->assertSame('connected', $account->status);
        $this->assertSame('Other Page', $account->account_name);
        $this->assertSame('page-2', $account->account_id);
        $this->assertSame('otherpage', $account->account_handle);
    }

    public function test_sm2_meta_oauth_handles_no_pages_safely(): void
    {
        Http::fake([
            'https://graph.facebook.com/v20.0/oauth/access_token' => Http::response([
                'access_token' => 'meta-read-token',
                'expires_in' => 3600,
                'token_type' => 'Bearer',
                'scope' => 'public_profile,pages_show_list,pages_read_engagement',
            ], 200),
            'https://graph.facebook.com/v20.0/me/accounts*' => Http::response(['data' => []], 200),
        ]);

        $start = $this->admin()->postJson('/api/admin/social/oauth/facebook_page/start')->assertOk();

        $this->getJson('/api/admin/social/oauth/callback?'.http_build_query([
            'platform' => 'facebook_page',
            'code' => 'oauth-code',
            'state' => $start->json('data.state'),
        ]))->assertOk();

        $account = SocialAccount::where('platform', 'facebook_page')->firstOrFail();
        $this->assertSame('connected_no_pages', $account->status);
        $this->assertNull($account->account_id);
        $this->assertSame(0, data_get($account->metadata, 'available_pages_count'));
        $this->assertSame('Meta connected, but no Facebook Pages were returned. Make sure your Facebook account has admin access to the Society Flats Page.', $account->last_error);
    }

    public function test_sm2_meta_page_debug_endpoint_requires_admin_token(): void
    {
        $this->getJson('/api/admin/social/meta/pages/debug')->assertUnauthorized();
    }

    public function test_sm2_meta_page_debug_endpoint_returns_safe_page_diagnostic_without_tokens(): void
    {
        Http::fake([
            'https://graph.facebook.com/v20.0/me?*' => Http::response([
                'id' => 'user-1',
                'name' => 'Nitin Wasson',
            ], 200),
            'https://graph.facebook.com/v20.0/me/accounts*' => Http::response([
                'data' => [[
                    'id' => 'page-1',
                    'name' => 'Society Flats',
                    'username' => 'societyflats',
                    'tasks' => ['CREATE_CONTENT', 'MODERATE'],
                    'access_token' => 'page-secret-token',
                    'instagram_business_account' => [
                        'id' => 'ig-1',
                        'username' => 'societyflats.in',
                        'name' => 'SocietyFlats Instagram',
                    ],
                ]],
            ], 200),
            'https://graph.facebook.com/v20.0/me/businesses*' => Http::response([
                'data' => [[
                    'id' => 'biz-1',
                    'name' => 'SocietyFlats Business',
                ]],
            ], 200),
            'https://graph.facebook.com/v20.0/biz-1/owned_pages*' => Http::response(['data' => []], 200),
            'https://graph.facebook.com/v20.0/biz-1/client_pages*' => Http::response(['data' => []], 200),
        ]);

        $account = SocialAccount::create([
            'platform' => 'facebook_page',
            'account_name' => 'Facebook Page',
            'status' => 'connected_no_pages',
            'last_error' => 'Meta connected, but no Facebook Pages were returned.',
            'scopes' => ['public_profile', 'pages_show_list', 'pages_read_engagement', 'business_management'],
        ]);
        $account->access_token = 'user-secret-token';
        $account->save();

        $response = $this->admin()->getJson('/api/admin/social/meta/pages/debug')
            ->assertOk()
            ->assertJsonPath('data.me.id', 'user-1')
            ->assertJsonPath('data.pages_count_from_me_accounts', 1)
            ->assertJsonPath('data.business_management_required', false)
            ->assertJsonPath('data.businesses_count', 1)
            ->assertJsonPath('data.businesses.0.id', 'biz-1')
            ->assertJsonPath('data.businesses.0.owned_pages_count', 0);

        $json = json_encode($response->json());
        $this->assertStringNotContainsString('user-secret-token', $json);
        $this->assertStringNotContainsString('page-secret-token', $json);
        $this->assertStringNotContainsString('access_token', $json);
        $this->assertStringNotContainsString('client_secret', $json);

        Http::assertSent(fn ($request) => str_contains($request->url(), '/me/accounts'));
        Http::assertSent(fn ($request) => str_contains($request->url(), '/me/businesses'));
        Http::assertSent(fn ($request) => str_contains($request->url(), '/biz-1/owned_pages'));
        Http::assertSent(fn ($request) => str_contains($request->url(), '/biz-1/client_pages'));
    }

    public function test_sm2_meta_page_debug_reports_missing_business_management_scope_clearly(): void
    {
        Http::fake([
            'https://graph.facebook.com/v20.0/me?*' => Http::response(['id' => 'user-1', 'name' => 'Nitin Wasson'], 200),
            'https://graph.facebook.com/v20.0/me/accounts*' => Http::response(['data' => []], 200),
            'https://graph.facebook.com/v20.0/me/businesses*' => Http::response([
                'error' => ['message' => '(#100) Missing Permission'],
            ], 400),
        ]);

        $account = SocialAccount::create([
            'platform' => 'facebook_page',
            'account_name' => 'Facebook Page',
            'status' => 'connected_no_pages',
            'scopes' => ['public_profile', 'pages_show_list', 'pages_read_engagement'],
        ]);
        $account->access_token = 'user-secret-token';
        $account->save();

        $response = $this->admin()->getJson('/api/admin/social/meta/pages/debug')
            ->assertOk()
            ->assertJsonPath('data.business_management_required', true)
            ->assertJsonPath('data.business_management_message', 'Business Portfolio lookup requires Meta business_management permission. Reconnect Meta after adding this scope.')
            ->assertJsonPath('data.last_error', 'Business Portfolio lookup requires Meta business_management permission. Reconnect Meta after adding this scope.');

        $json = json_encode($response->json());
        $this->assertStringNotContainsString('user-secret-token', $json);
        $this->assertStringNotContainsString('access_token', $json);
    }

    public function test_sm2_meta_business_fallback_detects_owned_pages_and_auto_connects_society_flats(): void
    {
        Http::fake([
            'https://graph.facebook.com/v20.0/me?*' => Http::response(['id' => 'user-1', 'name' => 'Nitin Wasson'], 200),
            'https://graph.facebook.com/v20.0/me/accounts*' => Http::response(['data' => []], 200),
            'https://graph.facebook.com/v20.0/me/businesses*' => Http::response(['data' => [['id' => 'biz-1', 'name' => 'SocietyFlats Business']]], 200),
            'https://graph.facebook.com/v20.0/biz-1/owned_pages*' => Http::response([
                'data' => [[
                    'id' => 'page-sf',
                    'name' => 'Society Flats',
                    'username' => 'societyflats',
                    'tasks' => ['CREATE_CONTENT'],
                    'instagram_business_account' => [
                        'id' => 'ig-sf',
                        'username' => 'societyflats.in',
                        'name' => 'SocietyFlats Instagram',
                    ],
                    'access_token' => 'page-secret-token',
                ]],
            ], 200),
            'https://graph.facebook.com/v20.0/biz-1/client_pages*' => Http::response(['data' => []], 200),
        ]);

        $account = SocialAccount::create([
            'platform' => 'facebook_page',
            'account_name' => 'Facebook Page',
            'status' => 'connected_no_pages',
            'scopes' => ['public_profile', 'pages_show_list', 'pages_read_engagement', 'business_management'],
        ]);
        $account->access_token = 'user-secret-token';
        $account->save();

        $response = $this->admin()->getJson('/api/admin/social/meta/pages/debug')
            ->assertOk()
            ->assertJsonPath('data.pages_count_from_me_accounts', 0)
            ->assertJsonPath('data.businesses.0.owned_pages_count', 1)
            ->assertJsonPath('data.businesses.0.owned_pages.0.name', 'Society Flats')
            ->assertJsonPath('data.businesses.0.owned_pages.0.has_instagram_business_account', true);

        $account->refresh();
        $this->assertSame('connected', $account->status);
        $this->assertSame('Society Flats', $account->account_name);
        $this->assertSame('page-sf', $account->account_id);
        $this->assertSame('business_asset_fallback', data_get($account->metadata, 'source'));
        $this->assertFalse((bool) data_get($account->metadata, 'publish_enabled'));
        $this->assertNotContains('pages_manage_posts', $account->scopes);

        $instagram = SocialAccount::where('platform', 'instagram_business')->firstOrFail();
        $this->assertSame('connected', $instagram->status);
        $this->assertSame('ig-sf', $instagram->account_id);
        $this->assertSame('societyflats.in', $instagram->account_handle);
        $this->assertSame('page-sf', data_get($instagram->metadata, 'connected_facebook_page_id'));

        $json = json_encode($response->json());
        $this->assertStringNotContainsString('user-secret-token', $json);
        $this->assertStringNotContainsString('page-secret-token', $json);
        $this->assertStringNotContainsString('access_token', $json);
    }

    public function test_sm2_meta_page_select_endpoint_saves_client_page_from_business_fallback(): void
    {
        Http::fake([
            'https://graph.facebook.com/v20.0/me?*' => Http::response(['id' => 'user-1', 'name' => 'Nitin Wasson'], 200),
            'https://graph.facebook.com/v20.0/me/accounts*' => Http::response(['data' => []], 200),
            'https://graph.facebook.com/v20.0/me/businesses*' => Http::response(['data' => [['id' => 'biz-1', 'name' => 'SocietyFlats Business']]], 200),
            'https://graph.facebook.com/v20.0/biz-1/owned_pages*' => Http::response(['data' => []], 200),
            'https://graph.facebook.com/v20.0/biz-1/client_pages*' => Http::response([
                'data' => [[
                    'id' => 'page-client',
                    'name' => 'Society Flats',
                    'username' => 'societyflats',
                    'tasks' => ['CREATE_CONTENT'],
                    'instagram_business_account' => [
                        'id' => 'ig-client',
                        'username' => 'societyflats.in',
                        'name' => 'SocietyFlats Instagram',
                    ],
                ]],
            ], 200),
        ]);

        $account = SocialAccount::create([
            'platform' => 'facebook_page',
            'account_name' => 'Facebook Page',
            'status' => 'connected_no_pages',
            'scopes' => ['public_profile', 'pages_show_list', 'pages_read_engagement', 'business_management'],
        ]);
        $account->access_token = 'user-secret-token';
        $account->save();

        $this->admin()->postJson('/api/admin/social/meta/pages/select', [
            'page_id' => 'page-client',
        ])->assertOk();

        $account->refresh();
        $this->assertSame('connected', $account->status);
        $this->assertSame('page-client', $account->account_id);
        $this->assertSame('client_pages', data_get($account->metadata, 'source'));

        $instagram = SocialAccount::where('platform', 'instagram_business')->firstOrFail();
        $this->assertSame('connected', $instagram->status);
        $this->assertSame('ig-client', $instagram->account_id);
    }

    public function test_sm2_meta_page_select_endpoint_saves_page_from_available_pages_metadata(): void
    {
        Http::fake([
            'https://graph.facebook.com/v20.0/me?*' => Http::response(['id' => 'user-1', 'name' => 'Nitin Wasson'], 200),
            'https://graph.facebook.com/v20.0/me/accounts*' => Http::response(['data' => []], 200),
            'https://graph.facebook.com/v20.0/me/businesses*' => Http::response(['data' => []], 200),
        ]);

        $account = SocialAccount::create([
            'platform' => 'facebook_page',
            'account_name' => 'Choose Facebook Page',
            'status' => 'pending_page_selection',
            'scopes' => ['public_profile', 'pages_show_list', 'pages_read_engagement', 'business_management'],
            'metadata' => [
                'available_pages_count' => 2,
                'available_pages' => [
                    ['id' => 'page-saved', 'name' => 'Society Flats', 'username' => 'societyflats'],
                    ['id' => 'page-other', 'name' => 'Other Page', 'username' => 'other'],
                ],
            ],
        ]);
        $account->access_token = 'user-secret-token';
        $account->save();

        $this->admin()->postJson('/api/admin/social/meta/pages/select', [
            'page_id' => 'page-saved',
        ])->assertOk();

        $account->refresh();
        $this->assertSame('connected', $account->status);
        $this->assertSame('Society Flats', $account->account_name);
        $this->assertSame('page-saved', $account->account_id);
        $this->assertSame('societyflats', $account->account_handle);
        $this->assertSame('available_pages', data_get($account->metadata, 'source'));
        $this->assertFalse((bool) data_get($account->metadata, 'publish_enabled'));
    }

    public function test_sm2_manual_meta_page_id_requires_explicit_confirmation(): void
    {
        Http::fake([
            'https://graph.facebook.com/v20.0/me?*' => Http::response(['id' => 'user-1', 'name' => 'Nitin Wasson'], 200),
            'https://graph.facebook.com/v20.0/me/accounts*' => Http::response(['data' => []], 200),
            'https://graph.facebook.com/v20.0/me/businesses*' => Http::response(['data' => []], 200),
        ]);

        $account = SocialAccount::create([
            'platform' => 'facebook_page',
            'account_name' => 'Facebook Page',
            'status' => 'connected_no_pages',
            'scopes' => ['public_profile', 'pages_show_list', 'pages_read_engagement', 'business_management'],
        ]);
        $account->access_token = 'user-secret-token';
        $account->save();

        $this->admin()->postJson('/api/admin/social/meta/pages/select', [
            'page_id' => 'manual-page',
            'page_name' => 'Society Flats',
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Selected Facebook Page was not found in Meta Page or Business assets. Manual fallback requires explicit confirmation.');
    }

    public function test_sm2_manual_meta_page_id_saves_without_enabling_publish_or_fake_instagram(): void
    {
        Http::fake([
            'https://graph.facebook.com/v20.0/me?*' => Http::response(['id' => 'user-1', 'name' => 'Nitin Wasson'], 200),
            'https://graph.facebook.com/v20.0/me/accounts*' => Http::response(['data' => []], 200),
            'https://graph.facebook.com/v20.0/me/businesses*' => Http::response(['data' => []], 200),
        ]);

        $account = SocialAccount::create([
            'platform' => 'facebook_page',
            'account_name' => 'Facebook Page',
            'status' => 'connected_no_pages',
            'scopes' => ['public_profile', 'pages_show_list', 'pages_read_engagement', 'business_management'],
        ]);
        $account->access_token = 'user-secret-token';
        $account->save();

        $response = $this->admin()->postJson('/api/admin/social/meta/pages/select', [
            'page_id' => 'manual-page',
            'page_name' => 'Society Flats',
            'manual_fallback_confirmed' => true,
        ])->assertOk();

        $account->refresh();
        $this->assertSame('connected_manual_page', $account->status);
        $this->assertSame('Society Flats', $account->account_name);
        $this->assertSame('manual-page', $account->account_id);
        $this->assertNull($account->account_handle);
        $this->assertSame('manual_page_id', data_get($account->metadata, 'source'));
        $this->assertTrue((bool) data_get($account->metadata, 'manual_page_warning'));
        $this->assertFalse((bool) data_get($account->metadata, 'publish_enabled'));
        $this->assertNotContains('pages_manage_posts', $account->scopes);

        $instagram = SocialAccount::where('platform', 'instagram_business')->firstOrFail();
        $this->assertSame('connected_missing_ig', $instagram->status);
        $this->assertNull($instagram->account_id);
        $this->assertSame('Instagram Business account could not be verified through Meta yet.', data_get($instagram->metadata, 'message'));

        $json = json_encode($response->json());
        $this->assertStringNotContainsString('user-secret-token', $json);
        $this->assertStringNotContainsString('access_token', $json);
    }

    public function test_sm2_manual_meta_select_saves_instagram_asset_when_supplied(): void
    {
        Http::fake([
            'https://graph.facebook.com/v20.0/me?*' => Http::response(['id' => 'user-1', 'name' => 'Nitin Wasson'], 200),
            'https://graph.facebook.com/v20.0/me/accounts*' => Http::response(['data' => []], 200),
            'https://graph.facebook.com/v20.0/me/businesses*' => Http::response(['data' => []], 200),
        ]);

        $account = SocialAccount::create([
            'platform' => 'facebook_page',
            'account_name' => 'Facebook Page',
            'status' => 'connected_no_pages',
            'scopes' => ['public_profile', 'pages_show_list', 'pages_read_engagement', 'business_management'],
            'token_expires_at' => now()->addHour(),
        ]);
        $account->access_token = 'user-secret-token';
        $account->save();

        $this->admin()->postJson('/api/admin/social/meta/pages/select', [
            'page_id' => '275936888926097',
            'page_name' => 'Society Flats',
            'instagram_id' => '17841461958211646',
            'instagram_handle' => '@societyflats',
            'manual_fallback_confirmed' => true,
        ])->assertOk();

        $account->refresh();
        $this->assertSame('connected_manual_page', $account->status);
        $this->assertSame('275936888926097', $account->account_id);
        $this->assertFalse((bool) data_get($account->metadata, 'publish_enabled'));

        $instagram = SocialAccount::where('platform', 'instagram_business')->firstOrFail();
        $this->assertSame('connected_manual_page', $instagram->status);
        $this->assertSame('societyflats', $instagram->account_name);
        $this->assertSame('societyflats', $instagram->account_handle);
        $this->assertSame('17841461958211646', $instagram->account_id);
        $this->assertSame($account->token_expires_at?->timestamp, $instagram->token_expires_at?->timestamp);
        $this->assertSame($account->scopes, $instagram->scopes);
        $this->assertSame('275936888926097', data_get($instagram->metadata, 'connected_facebook_page_id'));
        $this->assertSame('manual_instagram_id', data_get($instagram->metadata, 'source'));
        $this->assertSame('oauth', data_get($instagram->metadata, 'connected_via'));
        $this->assertTrue((bool) data_get($instagram->metadata, 'sm2_manual_only'));
        $this->assertTrue((bool) data_get($instagram->metadata, 'manual_instagram_warning'));
        $this->assertFalse((bool) data_get($instagram->metadata, 'sm1a_placeholder'));
        $this->assertFalse((bool) data_get($instagram->metadata, 'publish_enabled'));
        $this->assertSame('user-secret-token', $instagram->accessToken());
    }

    public function test_sm2_manual_instagram_asset_requires_confirmation_and_complete_fields(): void
    {
        $account = SocialAccount::create([
            'platform' => 'facebook_page',
            'account_name' => 'Facebook Page',
            'status' => 'connected_no_pages',
            'scopes' => ['public_profile', 'pages_show_list', 'pages_read_engagement', 'business_management'],
        ]);
        $account->access_token = 'user-secret-token';
        $account->save();

        $this->admin()->postJson('/api/admin/social/meta/pages/select', [
            'page_id' => '275936888926097',
            'page_name' => 'Society Flats',
            'instagram_id' => '17841461958211646',
            'instagram_handle' => 'societyflats',
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Manual Instagram asset save requires explicit manual confirmation.');

        $this->admin()->postJson('/api/admin/social/meta/pages/select', [
            'page_id' => '275936888926097',
            'page_name' => 'Society Flats',
            'instagram_id' => '17841461958211646',
            'manual_fallback_confirmed' => true,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Manual Instagram asset save requires both Instagram ID and Instagram handle.');
    }

    public function test_sm2_manual_instagram_asset_publish_remains_blocked_without_publish_scope(): void
    {
        $account = SocialAccount::create([
            'platform' => 'instagram_business',
            'account_name' => 'societyflats',
            'account_handle' => 'societyflats',
            'account_id' => '17841461958211646',
            'status' => 'connected_manual_page',
            'scopes' => ['public_profile', 'pages_show_list', 'pages_read_engagement', 'business_management'],
            'metadata' => ['publish_enabled' => false, 'source' => 'manual_instagram_id'],
        ]);
        $account->access_token = 'user-secret-token';
        $account->save();

        $post = SocialPost::create([
            'platform' => 'instagram',
            'post_type' => 'single_post',
            'title' => 'Approved Instagram update',
            'caption' => 'Approved neutral update.',
            'risk_level' => 'low',
            'status' => 'approved',
        ]);

        $this->admin()->postJson("/api/admin/social/posts/{$post->id}/publish", [
            'confirm_publish' => true,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Instagram publish blocked: instagram_content_publish permission is not granted.');
    }

    public function test_sm2_meta_page_select_endpoint_rejects_invalid_page_id(): void
    {
        Http::fake([
            'https://graph.facebook.com/v20.0/me?*' => Http::response(['id' => 'user-1', 'name' => 'Nitin Wasson'], 200),
            'https://graph.facebook.com/v20.0/me/accounts*' => Http::response(['data' => []], 200),
            'https://graph.facebook.com/v20.0/me/businesses*' => Http::response(['data' => []], 200),
        ]);

        $account = SocialAccount::create([
            'platform' => 'facebook_page',
            'account_name' => 'Facebook Page',
            'status' => 'connected_no_pages',
            'scopes' => ['public_profile', 'pages_show_list', 'pages_read_engagement', 'business_management'],
        ]);
        $account->access_token = 'user-secret-token';
        $account->save();

        $this->admin()->postJson('/api/admin/social/meta/pages/select', [
            'page_id' => 'missing-page',
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Selected Facebook Page was not found in Meta Page or Business assets. Manual fallback requires explicit confirmation.');
    }

    public function test_sm2_instagram_business_account_is_saved_when_connected_to_selected_page(): void
    {
        Http::fake([
            'https://graph.facebook.com/v20.0/oauth/access_token' => Http::response([
                'access_token' => 'meta-read-token',
                'expires_in' => 3600,
                'token_type' => 'Bearer',
                'scope' => 'public_profile,pages_show_list,pages_read_engagement',
            ], 200),
            'https://graph.facebook.com/v20.0/me/accounts*' => Http::response([
                'data' => [[
                    'id' => 'page-1',
                    'name' => 'Society Flats',
                    'username' => 'societyflats',
                    'instagram_business_account' => [
                        'id' => 'ig-1',
                        'username' => 'societyflats.in',
                        'name' => 'SocietyFlats Instagram',
                    ],
                ]],
            ], 200),
        ]);

        $start = $this->admin()->postJson('/api/admin/social/oauth/facebook_page/start')->assertOk();

        $this->getJson('/api/admin/social/oauth/callback?'.http_build_query([
            'platform' => 'facebook_page',
            'code' => 'oauth-code',
            'state' => $start->json('data.state'),
        ]))->assertOk();

        $instagram = SocialAccount::where('platform', 'instagram_business')->firstOrFail();
        $this->assertSame('connected', $instagram->status);
        $this->assertSame('SocietyFlats Instagram', $instagram->account_name);
        $this->assertSame('ig-1', $instagram->account_id);
        $this->assertSame('societyflats.in', $instagram->account_handle);
        $this->assertFalse((bool) data_get($instagram->metadata, 'publish_enabled'));
        $this->assertSame('meta-read-token', $instagram->accessToken());
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
            'https://graph.facebook.com/v20.0/page-1?*' => Http::response(['access_token' => 'ig-page-token', 'id' => 'page-1'], 200),
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

        // The linked Facebook Page holds pages_manage_posts; the IG publish must use ITS page
        // token, not the IG account's user token (using the user token triggers Meta error #10).
        $facebook = SocialAccount::create([
            'platform' => 'facebook_page', 'account_name' => 'Facebook Page', 'account_id' => 'page-1',
            'status' => 'connected', 'scopes' => ['pages_manage_posts'],
        ]);
        $facebook->access_token = 'fb-user-token';
        $facebook->save();

        $account = SocialAccount::create([
            'platform' => 'instagram_business',
            'account_name' => 'Instagram Business',
            'account_id' => 'ig-user-1',
            'status' => 'connected',
            'scopes' => ['instagram_content_publish', 'instagram_basic', 'pages_show_list', 'pages_read_engagement'],
            'metadata' => ['instagram_business_account_id' => 'ig-user-1', 'connected_facebook_page_id' => 'page-1'],
        ]);
        $account->access_token = 'secret-instagram-token';
        $account->save();

        $response = $this->admin()->postJson("/api/admin/social/posts/{$post->id}/publish", [
            'confirm_publish' => true,
            'social_account_id' => $account->id,
        ])->assertOk();

        // The media container was created with the Page token, never the IG user token.
        Http::assertSent(fn ($request) => str_contains($request->url(), '/ig-user-1/media') && ($request['access_token'] ?? null) === 'ig-page-token');

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
            ->assertJsonPath('message', 'Facebook publish blocked: pages_manage_posts permission is not granted.');

        $this->assertTrue(SocialPublishLog::where('social_post_id', $post->id)->where('status', 'blocked')->exists());
        $this->assertTrue(SocialPublishLog::where('social_post_id', $post->id)->where('metadata->reason', 'missing_scope')->exists());
    }

    public function test_sm2_facebook_publish_resolves_page_id_from_selected_page_when_account_id_cleared(): void
    {
        // Re-connecting in connect-only mode can null account_id while the manually selected
        // page id survives in metadata — publishing must still resolve the page.
        Http::fake([
            'https://graph.facebook.com/v20.0/page-manual?*' => Http::response(['access_token' => 'page-token', 'id' => 'page-manual'], 200),
            'https://graph.facebook.com/v20.0/page-manual/photos' => Http::response(['id' => 'fb-post-2'], 200),
        ]);

        $post = SocialPost::create([
            'platform' => 'facebook', 'post_type' => 'single_post', 'title' => 'FB post',
            'caption' => 'Neutral update.', 'risk_level' => 'low', 'status' => 'approved',
        ]);
        SocialPostAsset::create([
            'social_post_id' => $post->id, 'asset_type' => 'image', 'platform' => 'facebook',
            'public_url' => 'https://cdn.example.test/social/fb.jpg', 'status' => 'approved', 'risk_level' => 'low',
        ]);
        // Mirrors the real state after a manual-page publish authorization: status connected,
        // publish scope granted, but account_id null with the page id only in selected_page_id.
        $account = SocialAccount::create([
            'platform' => 'facebook_page', 'account_name' => 'Society Flats', 'account_id' => null,
            'status' => 'connected', 'scopes' => ['pages_manage_posts'],
            'metadata' => ['selected_page_id' => 'page-manual', 'facebook_publish_scope_granted' => true],
        ]);
        $account->access_token = 'user-token';
        $account->save();

        $this->admin()->postJson("/api/admin/social/posts/{$post->id}/publish", [
            'confirm_publish' => true, 'social_account_id' => $account->id,
        ])->assertOk();

        $this->assertDatabaseHas('social_posts', ['id' => $post->id, 'external_post_id' => 'fb-post-2']);
    }

    public function test_sm2_reconnecting_in_connect_mode_clears_stale_publish_grant(): void
    {
        // The bug: re-running Connect OAuth returned a token without pages_manage_posts but left
        // facebook_publish_scope_granted=true, so the UI wrongly showed publishing as enabled.
        Http::fake([
            'https://graph.facebook.com/v20.0/oauth/access_token' => Http::response(['access_token' => 'connect-token', 'token_type' => 'bearer'], 200),
            'https://graph.facebook.com/v20.0/me/accounts*' => Http::response(['data' => []], 200),
            'https://graph.facebook.com/v20.0/debug_token*' => Http::response(['data' => ['scopes' => ['pages_show_list', 'pages_read_engagement']]], 200),
        ]);

        $account = SocialAccount::create([
            'platform' => 'facebook_page', 'account_name' => 'Society Flats', 'account_id' => 'page-1',
            'status' => 'connected', 'oauth_state' => 'state-xyz',
            'scopes' => ['pages_show_list', 'pages_manage_posts'],
            'metadata' => ['oauth_mode' => 'connect', 'facebook_publish_scope_granted' => true, 'publish_enabled' => true],
        ]);
        $account->access_token = 'old-publish-token';
        $account->save();

        app(\App\Services\Social\SocialOAuthService::class)->callback('facebook_page', 'code-abc', 'state-xyz');

        $fresh = $account->fresh();
        $this->assertFalse((bool) data_get($fresh->metadata, 'facebook_publish_scope_granted'), 'Stale publish grant must be cleared to match the connect-only token.');
        $this->assertFalse((bool) data_get($fresh->metadata, 'publish_enabled'));
    }

    public function test_sm2_facebook_publish_resolves_and_uses_a_page_access_token(): void
    {
        // Posting to a Page needs a PAGE token, not the connecting user's token — the publisher
        // must derive it from GET /{page-id}?fields=access_token and post the feed with it.
        Http::fake([
            'https://graph.facebook.com/v20.0/page-1?*' => Http::response(['access_token' => 'page-scoped-token', 'id' => 'page-1'], 200),
            'https://graph.facebook.com/v20.0/page-1/photos' => Http::response(['id' => 'fb-post-1'], 200),
        ]);

        $post = SocialPost::create([
            'platform' => 'facebook', 'post_type' => 'single_post', 'title' => 'Approved FB post',
            'caption' => 'Neutral approved society update.', 'risk_level' => 'low', 'status' => 'approved',
        ]);
        SocialPostAsset::create([
            'social_post_id' => $post->id, 'asset_type' => 'image', 'platform' => 'facebook',
            'public_url' => 'https://cdn.example.test/social/fb.jpg', 'status' => 'approved', 'risk_level' => 'low',
        ]);
        $account = SocialAccount::create([
            'platform' => 'facebook_page', 'account_name' => 'Society Flats', 'account_id' => 'page-1',
            'status' => 'connected', 'scopes' => ['pages_show_list', 'pages_manage_posts'],
            'metadata' => ['facebook_publish_scope_granted' => true, 'publish_enabled' => true],
        ]);
        $account->access_token = 'user-token';
        $account->save();

        $this->admin()->postJson("/api/admin/social/posts/{$post->id}/publish", [
            'confirm_publish' => true,
            'social_account_id' => $account->id,
        ])->assertOk();

        $this->assertDatabaseHas('social_posts', ['id' => $post->id, 'publish_status' => 'published', 'external_post_id' => 'fb-post-1']);
        // The photo post used the PAGE token, never the raw user token.
        Http::assertSent(fn ($request) => str_contains($request->url(), '/page-1/photos') && ($request['access_token'] ?? null) === 'page-scoped-token');
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
            ->assertJsonPath('message', 'Instagram publish blocked: instagram_content_publish permission is not granted.');

        $this->assertTrue(SocialPublishLog::where('social_post_id', $post->id)->where('status', 'blocked')->exists());
        $this->assertTrue(SocialPublishLog::where('social_post_id', $post->id)->where('metadata->reason', 'missing_scope')->exists());
    }

    public function test_sm2_instagram_publish_is_blocked_without_approved_image_asset(): void
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
            'account_name' => 'societyflats',
            'account_id' => '17841461958211646',
            'status' => 'connected',
            'scopes' => ['instagram_content_publish'],
            'metadata' => [
                'instagram_business_account_id' => '17841461958211646',
                'instagram_publish_scope_granted' => true,
                'publish_enabled' => true,
            ],
        ]);
        $account->access_token = 'secret-instagram-token';
        $account->save();

        $this->admin()->postJson("/api/admin/social/posts/{$post->id}/publish", [
            'confirm_publish' => true,
            'social_account_id' => $account->id,
        ])->assertStatus(422)
            ->assertJsonPath('message', 'Instagram publish blocked: approved image asset required.');

        $this->assertTrue(SocialPublishLog::where('social_post_id', $post->id)->where('status', 'blocked')->exists());
        $this->assertTrue(SocialPublishLog::where('social_post_id', $post->id)->where('metadata->reason', 'missing_asset')->exists());
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
