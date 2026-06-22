<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ResidentReviewFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_review_requires_account_token_and_admin_approval_before_publication(): void
    {
        config(['services.admin_api_token' => 'admin-test-token']);

        $society = Society::create([
            'name' => 'Review Test Society',
            'slug' => 'review-test-society',
            'status' => 'Verified',
            'is_published' => true,
        ]);

        $plainToken = str_repeat('r', 80);
        Account::create([
            'role' => 'customer',
            'phone' => '9999999998',
            'phone_normalized' => '9999999998',
            'name' => 'Resident Reviewer',
            'status' => 'active',
            'phone_verified_at' => now(),
            'api_token_hash' => hash('sha256', $plainToken),
        ]);

        $payload = [
            'society_id' => $society->id,
            'rating' => 4.5,
            'title' => 'Good everyday living',
            'content' => 'Security and connectivity have been reliable during our stay.',
            'security_rating' => 5,
            'maintenance_rating' => 4,
            'amenities_rating' => 4,
            'connectivity_rating' => 5,
            'management_rating' => 4,
            'value_for_money_rating' => 4,
            'lived_duration_months' => 18,
            'pros' => ['Security', 'Connectivity'],
            'cons' => ['Visitor parking'],
        ];

        $this->postJson('/api/reviews', $payload)->assertUnauthorized();

        $created = $this->withToken($plainToken)
            ->postJson('/api/reviews', $payload)
            ->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonPath('data.is_verified_resident', true)
            ->json('data');

        $this->getJson('/api/societies/'.$society->slug.'/reviews')
            ->assertOk()
            ->assertJsonCount(0, 'data.data');

        $this->withToken('admin-test-token')
            ->putJson('/api/admin/reviews/'.$created['id'], ['status' => 'approved'])
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->getJson('/api/societies/'.$society->slug.'/reviews')
            ->assertOk()
            ->assertJsonCount(1, 'data.data')
            ->assertJsonPath('summary.count', 1)
            ->assertJsonPath('summary.average', 4.5);

        $this->withToken($plainToken)
            ->postJson('/api/reviews/'.$created['id'].'/helpful')
            ->assertOk()
            ->assertJsonPath('helpful', true)
            ->assertJsonPath('helpful_count', 1);
    }
}
