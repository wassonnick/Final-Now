<?php

namespace Tests\Feature;

use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AiChatTest extends TestCase
{
    use RefreshDatabase;

    public function test_empty_launch_inventory_returns_safe_fallback_and_persists_private_history(): void
    {
        $response = $this->postJson('/api/ai/chat', ['message' => 'Find a 3 BHK in Sector 65'])->assertOk()->assertJsonPath('provider', 'safe_fallback')->assertJsonCount(0, 'entities');
        $token = $response->json('conversation_token');
        $this->assertSame(64, strlen($token));
        $this->getJson('/api/ai/chat/'.$token)->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('data.0.role', 'user')->assertJsonPath('data.1.role', 'assistant');
        $this->assertDatabaseMissing('ai_conversations', ['access_token_hash' => $token]);
    }

    public function test_provider_context_contains_published_society_and_excludes_draft(): void
    {
        config(['services.gemini.api_key' => 'test-key', 'services.gemini.model' => 'test-model']);
        Society::create(['name' => 'Published Heights', 'slug' => 'published-heights', 'sector' => 'Sector 65', 'status' => 'Verified', 'is_published' => true]);
        Society::create(['name' => 'Draft Secret', 'slug' => 'draft-secret', 'sector' => 'Sector 65', 'status' => 'Draft', 'is_published' => false]);
        Http::fake(function ($request) {
            $body = $request->body();
            $this->assertStringContainsString('Published Heights', $body);
            $this->assertStringNotContainsString('Draft Secret', $body);

            return Http::response(['candidates' => [['content' => ['parts' => [['text' => 'Published Heights is the verified match.']]]]]]);
        });

        $this->postJson('/api/ai/chat', ['message' => 'What is available in Sector 65?'])->assertOk()->assertJsonPath('provider', 'gemini')->assertJsonPath('entities.0.name', 'Published Heights');
    }
}
