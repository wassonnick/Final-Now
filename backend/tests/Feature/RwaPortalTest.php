<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\BuilderClaim;
use App\Models\RwaReply;
use App\Models\RwaThread;
use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RwaPortalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
    }

    private function society(array $extra = []): Society
    {
        return Society::create(array_merge([
            'name' => 'Godrej Summit',
            'slug' => 'godrej-summit-gurugram',
            'city' => 'Gurugram',
            'state' => 'Haryana',
            'sector' => 'Sector 104',
            'status' => 'Verified',
            'is_published' => true,
            'score' => 9.1,
        ], $extra));
    }

    private function account(string $token, string $role = 'rwa'): Account
    {
        return Account::create([
            'role' => $role,
            'phone' => '9999999999',
            'phone_normalized' => '9999999999',
            'name' => 'RWA Secretary',
            'status' => 'active',
            'api_token_hash' => hash('sha256', $token),
        ]);
    }

    public function test_rwa_claim_is_separate_from_builder_claim_and_requires_admin_approval(): void
    {
        $society = $this->society();
        $token = str_repeat('r', 48);
        $account = $this->account($token);

        BuilderClaim::create([
            'account_id' => $account->id,
            'society_id' => $society->id,
            'claim_type' => 'builder',
            'organisation_name' => 'Builder Office',
            'representative_name' => 'Builder Rep',
            'representative_role' => 'CRM',
            'phone' => '9999999999',
            'registration_number' => 'RC-TEST-1234', 'proof_notes' => 'Builder relationship proof is available for review.',
            'status' => 'approved',
        ]);

        $payload = [
            'society_id' => $society->id,
            'organisation_name' => 'Godrej Summit AOA',
            'representative_name' => 'RWA Secretary',
            'representative_role' => 'Secretary',
            'phone' => '9999999999',
            'registration_number' => 'RWA-REG-5678', 'proof_notes' => 'AOA registration and society office proof available for SocietyFlats review.',
        ];

        $this->postJson('/api/accounts/rwa/claims', $payload)->assertUnauthorized();
        $this->withToken($token)->postJson('/api/accounts/rwa/claims', $payload)
            ->assertCreated()
            ->assertJsonPath('data.claim_type', 'rwa')
            ->assertJsonPath('data.status', 'pending');

        $this->assertDatabaseCount('builder_claims', 2);
        $rwaClaim = BuilderClaim::where('claim_type', 'rwa')->firstOrFail();

        $this->withToken($token)->postJson("/api/accounts/rwa/claims/{$rwaClaim->id}/announcements", [
            'title' => 'Water supply maintenance',
            'category' => 'maintenance',
            'content' => 'Water supply maintenance is scheduled for Sunday morning.',
        ])->assertForbidden();

        $this->withToken('admin-test-token')->patchJson("/api/admin/rwa-claims/{$rwaClaim->id}", ['status' => 'approved'])->assertOk();

        $this->withToken($token)->postJson("/api/accounts/rwa/claims/{$rwaClaim->id}/announcements", [
            'title' => 'Water supply maintenance',
            'category' => 'maintenance',
            'content' => 'Water supply maintenance is scheduled for Sunday morning.',
        ])->assertCreated();
    }

    public function test_public_threads_are_moderated_and_approved_rwa_can_reply_and_resolve(): void
    {
        $society = $this->society();
        $token = str_repeat('s', 48);
        $account = $this->account($token);
        $claim = BuilderClaim::create([
            'account_id' => $account->id,
            'society_id' => $society->id,
            'claim_type' => 'rwa',
            'organisation_name' => 'Godrej Summit AOA',
            'representative_name' => 'RWA Secretary',
            'representative_role' => 'Secretary',
            'phone' => '9999999999',
            'registration_number' => 'RWA-REG-9012', 'proof_notes' => 'AOA registration proof available for review.',
            'status' => 'approved',
            'reviewed_at' => now(),
        ]);

        $this->postJson('/api/rwa/societies/godrej-summit-gurugram/threads', [
            'type' => 'grievance',
            'title' => 'Basement seepage near tower B',
            'body' => 'There is visible seepage near tower B basement parking and it needs attention.',
        ])->assertCreated()->assertJsonPath('data.status', 'pending');

        $thread = RwaThread::firstOrFail();
        $this->getJson('/api/rwa/societies/godrej-summit-gurugram')
            ->assertOk()
            ->assertJsonCount(0, 'data.threads');

        $thread->update(['status' => 'approved', 'published_at' => now()]);

        $this->withToken($token)->postJson("/api/rwa/threads/{$thread->id}/replies", [
            'body' => 'The RWA maintenance team has logged this and inspection is scheduled tomorrow.',
        ])->assertCreated()->assertJsonPath('data.is_official', true);

        $this->withToken($token)->postJson("/api/accounts/rwa/threads/{$thread->id}/resolve")
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('rwa_replies', [
            'rwa_thread_id' => $thread->id,
            'builder_claim_id' => $claim->id,
            'status' => 'approved',
            'is_official' => true,
        ]);
        $this->assertNotNull(RwaReply::first()->published_at);

        $this->getJson('/api/rwa/societies/godrej-summit-gurugram')
            ->assertOk()
            ->assertJsonPath('data.stats.claim_status', 'claimed')
            ->assertJsonPath('data.stats.resolved_threads', 1)
            ->assertJsonCount(1, 'data.threads')
            ->assertJsonPath('data.threads.0.replies.0.is_official', true);
    }
}
