<?php

namespace Tests\Feature;

use App\Models\Society;
use App\Services\Ai\SocietyAssistantService;
use App\Services\Ai\SocietyMatchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiChatTest extends TestCase
{
    use RefreshDatabase;

    public function test_matcher_only_ranks_published_verified_societies_and_excludes_drafts(): void
    {
        Society::create(['name' => 'Published Heights', 'slug' => 'published-heights', 'sector' => 'Sector 65', 'locality' => 'Sector 65', 'status' => 'Verified', 'verification_status' => 'Verified', 'is_published' => true, 'score' => 8.4]);
        Society::create(['name' => 'Draft Secret', 'slug' => 'draft-secret', 'sector' => 'Sector 65', 'status' => 'Draft', 'verification_status' => 'Needs Review', 'is_published' => false, 'score' => 9]);

        $result = app(SocietyMatchService::class)->searchStructured(['intent' => 'rent', 'locations' => ['sector 65']]);

        $names = collect($result['matches'])->pluck('society_name');
        $this->assertTrue($names->contains('Published Heights'));
        $this->assertFalse($names->contains('Draft Secret'), 'Draft societies must never surface.');
        $this->assertSame('/society/published-heights', $result['matches'][0]['url']);
    }

    public function test_chat_returns_safe_fallback_when_assistant_is_unconfigured_and_persists_private_history(): void
    {
        config(['services.claude.api_key' => '']); // assistant unavailable

        $response = $this->postJson('/api/ai/chat', ['message' => 'Find a 3 BHK in Sector 65'])
            ->assertOk()
            ->assertJsonPath('provider', 'safe_fallback')
            ->assertJsonCount(0, 'matches');

        $token = $response->json('conversation_token');
        $this->assertSame(64, strlen($token));
        $this->getJson('/api/ai/chat/'.$token)->assertOk()
            ->assertJsonCount(2, 'data')
            ->assertJsonPath('data.0.role', 'user')
            ->assertJsonPath('data.1.role', 'assistant');
        // The raw token is never stored — only its hash.
        $this->assertDatabaseMissing('ai_conversations', ['access_token_hash' => $token]);
    }

    public function test_chat_returns_assistant_reply_with_rich_matches_and_backward_compatible_entities(): void
    {
        $this->mock(SocietyAssistantService::class, function ($mock) {
            $mock->shouldReceive('reply')->once()->andReturn([
                'reply' => 'For a Sector 65 rental I\'d look at Published Heights first — strong score and it fits your budget.',
                'matches' => [[
                    'id' => 42, 'society_name' => 'Published Heights', 'slug' => 'published-heights', 'sector' => 'Sector 65',
                    'score' => 8.4, 'rent_range' => '₹60,000 - ₹90,000 per month', 'buy_range' => null, 'available_homes' => 2,
                    'reason' => 'Strong score and budget fit.', 'reasons' => [], 'tags' => ['Sector 65'], 'url' => '/society/published-heights',
                ]],
                'provider' => 'claude',
            ]);
        });

        $this->postJson('/api/ai/chat', ['message' => '3 BHK rental in Sector 65 under 90k'])
            ->assertOk()
            ->assertJsonPath('provider', 'claude')
            ->assertJsonPath('matches.0.society_name', 'Published Heights')
            ->assertJsonPath('matches.0.score', 8.4)
            ->assertJsonPath('entities.0.name', 'Published Heights')
            ->assertJsonPath('entities.0.url', '/society/published-heights');

        $this->assertDatabaseHas('ai_messages', ['role' => 'assistant']);
    }
}
