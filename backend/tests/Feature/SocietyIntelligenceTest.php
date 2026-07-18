<?php

namespace Tests\Feature;

use App\Models\IntelligenceCorrection;
use App\Models\Society;
use App\Models\SocietyIntelligenceProfile;
use App\Services\SocietyIntelligenceScoringService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SocietyIntelligenceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
    }

    public function test_draft_intelligence_is_not_public(): void
    {
        $society = $this->society();
        $society->intelligenceProfile()->create([
            'intelligence_status' => SocietyIntelligenceProfile::STATUS_DRAFT,
            'overall_score' => 8.4,
            'evidence_coverage_score' => 80,
        ]);

        $this->getJson('/api/societies/'.$society->slug.'/intelligence')
            ->assertOk()
            ->assertJsonPath('data', null);
    }

    public function test_public_intelligence_hides_private_sources_and_unpublished_risks(): void
    {
        $society = $this->society();
        $profile = $society->intelligenceProfile()->create([
            'intelligence_status' => SocietyIntelligenceProfile::STATUS_PUBLISHED,
            'published_at' => now(),
            'overall_score' => 8.4,
            'evidence_coverage_score' => 80,
            'top_strengths_json' => [
                ['label' => 'Strong connectivity', 'status' => 'published'],
                ['label' => 'Internal admin note', 'status' => 'draft'],
            ],
            'things_to_verify_json' => [
                ['label' => 'Confirm tower-wise possession', 'public' => true, 'status' => 'published'],
                ['label' => 'Private legal note', 'public' => false, 'status' => 'published'],
            ],
        ]);

        $profile->sources()->create([
            'field_key' => 'rera',
            'source_type' => 'public_record',
            'source_name' => 'Public RERA lookup',
            'verification_status' => 'verified',
            'confidence_level' => 'high',
            'is_public' => true,
            'status' => 'active',
        ]);
        $profile->sources()->create([
            'field_key' => 'admin_note',
            'source_type' => 'private_note',
            'source_name' => 'Internal call log',
            'verification_status' => 'private',
            'confidence_level' => 'high',
            'is_public' => false,
            'status' => 'active',
        ]);

        $json = $this->getJson('/api/societies/'.$society->slug.'/intelligence')->assertOk()->json('data');

        $encoded = json_encode($json);
        $this->assertStringContainsString('Strong connectivity', $encoded);
        $this->assertStringContainsString('Confirm tower-wise possession', $encoded);
        $this->assertStringContainsString('Public RERA lookup', $encoded);
        $this->assertStringNotContainsString('Internal admin note', $encoded);
        $this->assertStringNotContainsString('Private legal note', $encoded);
        $this->assertStringNotContainsString('Internal call log', $encoded);
    }

    public function test_public_payload_exposes_labelled_signal_breakdown(): void
    {
        $society = $this->society();
        $society->intelligenceProfile()->create([
            'intelligence_status' => SocietyIntelligenceProfile::STATUS_PUBLISHED,
            'published_at' => now(),
            'overall_score' => 8.1,
            'evidence_coverage_score' => 75,
            'score_inputs_json' => [
                'connectivity_score' => ['score' => 8.4, 'status' => 'verified', 'source' => 'connectivity_score'],
                'legal_rera_confidence_score' => ['score' => 7.0, 'status' => 'estimated', 'source' => 'rera_context'],
                'environmental_resilience_score' => ['score' => null, 'status' => 'missing', 'source' => 'environmental_context'],
            ],
        ]);

        $breakdown = collect($this->getJson('/api/societies/'.$society->slug.'/intelligence')->assertOk()->json('data.signal_breakdown'));

        // All ten weighted signals present, labelled, with weight percentages.
        $this->assertCount(10, $breakdown);
        $connectivity = $breakdown->firstWhere('key', 'connectivity_score');
        $this->assertSame('Connectivity & commute', $connectivity['label']);
        $this->assertSame(15, $connectivity['weight']);
        $this->assertSame('verified', $connectivity['status']);
        // Missing signal is shown honestly, not hidden or guessed.
        $environmental = $breakdown->firstWhere('key', 'environmental_resilience_score');
        $this->assertSame('missing', $environmental['status']);
        $this->assertNull($environmental['score']);
    }

    public function test_recalculation_creates_review_only_profile(): void
    {
        $society = $this->society(['score' => 8.6, 'connectivity_score' => 8.5, 'lifestyle_score' => 8.1]);

        $this->withToken('admin-test-token')
            ->postJson('/api/admin/societies/'.$society->id.'/intelligence/recalculate')
            ->assertOk()
            ->assertJsonPath('data.intelligence_status', SocietyIntelligenceProfile::STATUS_DRAFT);

        $this->assertNull($society->intelligenceProfile()->first()->published_at);
    }

    public function test_publish_requires_public_society_and_approval(): void
    {
        $society = $this->society(['is_published' => false]);
        $society->intelligenceProfile()->create([
            'intelligence_status' => SocietyIntelligenceProfile::STATUS_APPROVED,
            'evidence_coverage_score' => SocietyIntelligenceScoringService::MINIMUM_COVERAGE,
        ]);

        $this->withToken('admin-test-token')
            ->postJson('/api/admin/societies/'.$society->id.'/intelligence/publish')
            ->assertStatus(422);

        $society->update(['is_published' => true]);

        $this->withToken('admin-test-token')
            ->postJson('/api/admin/societies/'.$society->id.'/intelligence/publish')
            ->assertOk()
            ->assertJsonPath('data.intelligence_status', SocietyIntelligenceProfile::STATUS_PUBLISHED);
    }

    public function test_public_correction_submission_is_review_only(): void
    {
        $society = $this->society();

        $this->postJson('/api/public/intelligence-corrections', [
            'society_id' => $society->id,
            'information_challenged' => 'Possession date looks stale.',
            'suggested_correction' => 'Please verify tower-wise delivery date.',
            'name' => 'Resident',
            'email' => 'resident@example.com',
            'consent' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'submitted');

        $this->assertDatabaseHas('intelligence_corrections', [
            'society_id' => $society->id,
            'status' => 'submitted',
        ]);
        $this->assertSame(1, IntelligenceCorrection::count());
    }

    private function society(array $overrides = []): Society
    {
        return Society::create(array_merge([
            'name' => 'Emerald Heights',
            'slug' => 'emerald-heights',
            'builder' => 'Test Builder',
            'sector' => 'Sector 65',
            'locality' => 'Golf Course Extension Road',
            'city' => 'Gurgaon',
            'description' => 'A published society profile for intelligence testing.',
            'status' => 'Verified',
            'is_published' => true,
            'score' => 8.4,
            'connectivity_score' => 8.1,
            'lifestyle_score' => 8.0,
            'maintenance_score' => 7.8,
            'security_score' => 8.2,
            'investment_score' => 7.9,
            'amenities' => ['Clubhouse', 'Gym', '24x7 Security'],
            'nearby_schools' => ['School A — verified public result'],
            'nearby_metro' => ['Metro — verified public result'],
            'rent_range' => '₹55k–₹90k',
            'buy_range' => '₹2.4–3.8 Cr',
        ], $overrides));
    }
}
