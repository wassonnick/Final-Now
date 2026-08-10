<?php

namespace Tests\Feature;

use App\Models\AiConversation;
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

    public function test_matcher_finds_a_society_named_directly_even_with_a_low_score(): void
    {
        // A published society with a modest score, plus higher-scored noise. Naming it directly
        // must surface it — the exact case where users were told "not in our database".
        Society::create(['name' => 'M3M Escala', 'slug' => 'm3m-escala-sector-70a', 'sector' => 'Sector 70A', 'locality' => 'Sector 70A', 'status' => 'Verified', 'verification_status' => 'Verified', 'is_published' => true, 'score' => 6.2]);
        foreach (range(1, 5) as $i) {
            Society::create(['name' => "Noise Society {$i}", 'slug' => "noise-{$i}", 'sector' => 'Sector 99', 'status' => 'Verified', 'verification_status' => 'Verified', 'is_published' => true, 'score' => 9.5]);
        }

        $result = app(SocietyMatchService::class)->searchStructured(['intent' => 'buy', 'keywords' => ['m3m', 'escala'], 'free_text' => 'Tell me about living in M3M Escala']);

        $names = collect($result['matches'])->pluck('society_name');
        $this->assertTrue($names->contains('M3M Escala'), 'A directly-named published society must always be found.');
        $this->assertSame('M3M Escala', $result['matches'][0]['society_name'], 'The named society should lead the results.');
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

    /**
     * The abandonment beacon has to go out as text/plain — a JSON content type makes the
     * cross-origin request non-simple, and the preflight cannot complete during unload.
     * Every conversation showed "no exit recorded" because of it.
     */
    public function test_an_outcome_beacon_sent_as_text_plain_is_recorded(): void
    {
        $token = $this->openConversation();

        $this->call(
            'POST',
            "/api/ai/chat/{$token}/outcome",
            [], [], [],
            ['CONTENT_TYPE' => 'text/plain;charset=UTF-8'],
            json_encode(['outcome' => 'abandoned']),
        )->assertSuccessful();

        $this->assertSame('abandoned', AiConversation::query()->latest('id')->value('outcome'));
    }

    /** The normal JSON path must keep working exactly as before. */
    public function test_an_outcome_sent_as_json_is_still_recorded(): void
    {
        $token = $this->openConversation();

        $this->postJson("/api/ai/chat/{$token}/outcome", ['outcome' => 'society_opened', 'detail' => 'published-heights'])
            ->assertSuccessful();

        $conversation = AiConversation::query()->latest('id')->firstOrFail();
        $this->assertSame('society_opened', $conversation->outcome);
        $this->assertSame('published-heights', $conversation->outcome_detail);
    }

    /** A body that is neither JSON nor decodable must be rejected, not silently accepted. */
    public function test_a_malformed_beacon_body_is_rejected(): void
    {
        $token = $this->openConversation();

        $this->call(
            'POST',
            "/api/ai/chat/{$token}/outcome",
            [], [], [],
            ['CONTENT_TYPE' => 'text/plain', 'HTTP_ACCEPT' => 'application/json'],
            'not json at all',
        )->assertStatus(422);
    }

    private function openConversation(): string
    {
        $response = $this->postJson('/api/ai/chat', [
            'message' => 'Tell me about living in Published Heights',
            'entry_source' => 'advisor_page',
            'entry_label' => 'handoff_query',
        ])->assertSuccessful();

        return (string) $response->json('conversation_token');
    }
}
