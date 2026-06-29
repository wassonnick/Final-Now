<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\BuilderClaim;
use App\Models\Property;
use App\Models\Review;
use App\Models\SavedSearch;
use App\Models\Society;
use App\Services\SavedSearchMatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SavedSearchAlertsAndReviewResponsesTest extends TestCase
{
    use RefreshDatabase;

    private function account(string $token): Account
    {
        return Account::create(['role' => 'customer', 'phone' => '9999999999', 'phone_normalized' => '9999999999', 'name' => 'Test User', 'status' => 'active', 'api_token_hash' => hash('sha256', $token)]);
    }

    public function test_matcher_only_queues_published_live_inventory_once(): void
    {
        $account = $this->account(str_repeat('x', 48));
        $published = Society::create(['name' => 'Published', 'slug' => 'published', 'status' => 'Verified', 'is_published' => true]);
        $draft = Society::create(['name' => 'Draft', 'slug' => 'draft', 'status' => 'Draft', 'is_published' => false]);
        Property::create(['society_id' => $published->id, 'title' => 'Live home', 'slug' => 'live-home', 'listing_type' => 'Rent', 'status' => 'Live', 'verified' => true, 'verified_at' => now(), 'availability_checked_at' => now(), 'published_at' => now(), 'price' => '50000']);
        Property::create(['society_id' => $draft->id, 'title' => 'Hidden home', 'slug' => 'hidden-home', 'listing_type' => 'Rent', 'status' => 'Live', 'price' => '40000']);
        SavedSearch::create(['account_id' => $account->id, 'name' => 'Rent homes', 'filters' => ['tab' => 'rent'], 'alert_enabled' => true, 'alert_channel' => 'whatsapp', 'alert_frequency' => 'daily']);

        $first = app(SavedSearchMatcher::class)->run(false);
        $this->assertSame(1, $first['matches_created']);
        $this->assertDatabaseCount('saved_search_alerts', 1);
        SavedSearch::query()->update(['last_checked_at' => now()->subDays(2)]);
        $second = app(SavedSearchMatcher::class)->run(false);
        $this->assertSame(0, $second['matches_created']);
        $this->assertDatabaseCount('saved_search_alerts', 1);
    }

    public function test_approved_claim_can_submit_moderated_review_response(): void
    {
        $token = str_repeat('y', 48);
        $account = $this->account($token);
        $society = Society::create(['name' => 'Published', 'slug' => 'published', 'status' => 'Verified', 'is_published' => true]);
        $review = Review::create(['society_id' => $society->id, 'account_id' => $account->id, 'reviewer_name' => 'Resident', 'rating' => 4, 'title' => 'Maintenance feedback', 'content' => 'A sufficiently detailed resident review.', 'status' => 'approved']);
        $claim = BuilderClaim::create(['account_id' => $account->id, 'society_id' => $society->id, 'organisation_name' => 'Test RWA', 'representative_name' => 'Test User', 'representative_role' => 'Secretary', 'phone' => '9999999999', 'proof_notes' => 'Verified proof information.', 'status' => 'approved']);

        $this->withToken($token)->postJson("/api/accounts/builder-claims/{$claim->id}/reviews/{$review->id}/response", ['content' => 'Thank you. The maintenance issue is being addressed.'])->assertCreated()->assertJsonPath('data.status', 'pending');
        $this->getJson('/api/societies/published/reviews')->assertOk()->assertJsonCount(0, 'data.data.0.responses');
    }
}
