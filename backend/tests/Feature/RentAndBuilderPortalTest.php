<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\BuilderClaim;
use App\Models\RentHistory;
use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RentAndBuilderPortalTest extends TestCase
{
    use RefreshDatabase;

    private function society(array $extra = []): Society
    {
        return Society::create(array_merge(['name' => 'Test Society', 'slug' => 'test-society', 'city' => 'Gurugram', 'status' => 'Verified', 'is_published' => true], $extra));
    }

    public function test_public_rent_history_only_exposes_verified_rows_for_published_society(): void
    {
        $society = $this->society();
        RentHistory::create(['society_id' => $society->id, 'recorded_on' => '2026-01-01', 'median_rent' => 50000, 'source_name' => 'Admin evidence', 'status' => 'draft']);
        RentHistory::create(['society_id' => $society->id, 'recorded_on' => '2026-02-01', 'median_rent' => 52000, 'source_name' => 'Admin evidence', 'status' => 'verified']);
        $this->getJson('/api/societies/test-society/rent-history')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.median_rent', 52000);
        $society->update(['is_published' => false]);
        $this->getJson('/api/societies/test-society/rent-history')->assertNotFound();
    }

    public function test_claim_and_announcement_require_account_and_admin_approval(): void
    {
        $society = $this->society();
        $token = str_repeat('x', 48);
        $account = Account::create(['role' => 'customer', 'phone' => '9999999999', 'phone_normalized' => '9999999999', 'name' => 'RWA User', 'status' => 'active', 'api_token_hash' => hash('sha256', $token)]);
        $payload = ['society_id' => $society->id, 'organisation_name' => 'Test RWA', 'representative_name' => 'RWA User', 'representative_role' => 'Secretary', 'phone' => '9999999999', 'proof_notes' => 'Registration proof available for verification.'];
        $this->postJson('/api/accounts/builder-claims', $payload)->assertUnauthorized();
        $this->withToken($token)->postJson('/api/accounts/builder-claims', $payload)->assertCreated()->assertJsonPath('data.status', 'pending');
        $claim = BuilderClaim::first();
        $this->withToken($token)->postJson("/api/accounts/builder-claims/{$claim->id}/announcements", ['title' => 'Water update', 'category' => 'maintenance', 'content' => 'Maintenance timing has changed.'])->assertForbidden();
        $claim->update(['status' => 'approved']);
        $this->withToken($token)->postJson("/api/accounts/builder-claims/{$claim->id}/announcements", ['title' => 'Water update', 'category' => 'maintenance', 'content' => 'Maintenance timing has changed.'])->assertCreated();
        $this->getJson('/api/societies/test-society/announcements')->assertOk()->assertJsonCount(0, 'data');
    }
}
