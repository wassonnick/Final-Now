<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AiConversation;
use App\Services\Ai\SocietyAssistantService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class AiChatController extends Controller
{
    public function store(Request $request, SocietyAssistantService $assistant): JsonResponse
    {
        $data = $request->validate(['message' => ['required', 'string', 'min:2', 'max:1500'], 'conversation_token' => ['nullable', 'string', 'size:64']]);
        [$conversation, $plainToken] = $this->conversation($data['conversation_token'] ?? null);
        if (! $conversation) {
            return response()->json(['message' => 'Conversation expired or unavailable. Start a new chat.'], 404);
        }

        $chatResult = $assistant->reply($conversation, trim($data['message']));
        // Rich society cards for the assistant UI, plus a lightweight entity list so any older
        // client still renders links.
        $entities = collect($chatResult['matches'])->map(fn ($m) => ['type' => 'society', 'id' => $m['id'], 'name' => $m['society_name'], 'url' => $m['url']])->values()->all();

        $result = DB::transaction(function () use ($conversation, $data, $chatResult, $entities) {
            $conversation->messages()->create(['role' => 'user', 'content' => trim($data['message'])]);
            $assistant = $conversation->messages()->create(['role' => 'assistant', 'content' => $chatResult['reply'], 'context_entities' => $chatResult['matches']]);
            $conversation->update(['model' => $chatResult['provider'], 'last_message_at' => now(), 'expires_at' => now()->addDays(30)]);

            return [$chatResult, $assistant, $entities];
        });

        return response()->json(['status' => 'ok', 'conversation_token' => $plainToken ?: ($data['conversation_token'] ?? null), 'reply' => $result[0]['reply'], 'provider' => $result[0]['provider'], 'matches' => $result[0]['matches'], 'entities' => $result[2], 'message_id' => $result[1]->id]);
    }

    public function show(string $token): JsonResponse
    {
        $conversation = AiConversation::query()->where('access_token_hash', hash('sha256', $token))->where('status', 'active')->where('expires_at', '>', now())->firstOrFail();

        return response()->json(['data' => $conversation->messages()->oldest()->limit(50)->get(['id', 'role', 'content', 'context_entities', 'created_at'])]);
    }

    private function conversation(?string $token): array
    {
        if ($token) {
            return [AiConversation::query()->where('access_token_hash', hash('sha256', $token))->where('status', 'active')->where('expires_at', '>', now())->first(), null];
        }
        $plain = Str::random(64);

        return [AiConversation::create(['access_token_hash' => hash('sha256', $plain), 'status' => 'active', 'expires_at' => now()->addDays(30)]), $plain];
    }
}
