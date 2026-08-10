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
        $data = $request->validate([
            'message' => ['required', 'string', 'min:2', 'max:1500'],
            'conversation_token' => ['nullable', 'string', 'size:64'],
            // Journey context — recorded once, when the conversation is created.
            'entry_source' => ['nullable', 'string', 'max:40'],
            'entry_label' => ['nullable', 'string', 'max:60'],
            'entry_path' => ['nullable', 'string', 'max:255'],
        ]);
        [$conversation, $plainToken] = $this->conversation($data['conversation_token'] ?? null, $data);
        if (! $conversation) {
            return response()->json(['message' => 'Conversation expired or unavailable. Start a new chat.'], 404);
        }

        $chatResult = $assistant->reply($conversation, trim($data['message']));
        // Rich society cards for the assistant UI, plus a lightweight entity list so any older
        // client still renders links.
        $entities = collect($chatResult['matches'])->map(fn ($m) => ['type' => 'society', 'id' => $m['id'], 'name' => $m['society_name'], 'url' => $m['url']])->values()->all();
        $suggested = $chatResult['suggested_replies'] ?? [];

        $result = DB::transaction(function () use ($conversation, $data, $chatResult, $entities, $suggested) {
            $conversation->messages()->create(['role' => 'user', 'content' => trim($data['message'])]);
            // Store the normalized entity list (type/id/name/url) so the profile links render the
            // same on a page reload as they do live — the raw match shape used society_name.
            // Same for the tappable answers, so a restored thread offers the same next step.
            $assistant = $conversation->messages()->create([
                'role' => 'assistant',
                'content' => $chatResult['reply'],
                'context_entities' => $entities,
                'suggested_replies' => $suggested ?: null,
            ]);
            $conversation->update(['model' => $chatResult['provider'], 'last_message_at' => now(), 'expires_at' => now()->addDays(30)]);

            return [$chatResult, $assistant, $entities];
        });

        return response()->json([
            'status' => 'ok',
            'conversation_token' => $plainToken ?: ($data['conversation_token'] ?? null),
            'reply' => $result[0]['reply'],
            'provider' => $result[0]['provider'],
            'matches' => $result[0]['matches'],
            'entities' => $result[2],
            'suggested_replies' => $suggested,
            'message_id' => $result[1]->id,
        ]);
    }

    public function show(string $token): JsonResponse
    {
        $conversation = AiConversation::query()->where('access_token_hash', hash('sha256', $token))->where('status', 'active')->where('expires_at', '>', now())->firstOrFail();

        return response()->json(['data' => $conversation->messages()->oldest()->limit(50)->get(['id', 'role', 'content', 'context_entities', 'suggested_replies', 'created_at'])]);
    }

    /**
     * Record how a conversation ended — a society opened, a callback started, the thread
     * reset, or simply abandoned. Called from the UI, including via sendBeacon on page
     * hide, so it stays cheap and never fails loudly. The abandon beacon always arrives
     * last, so a weaker outcome never overwrites a stronger one (see recordOutcome).
     */
    public function outcome(Request $request, string $token): JsonResponse
    {
        // Sent by navigator.sendBeacon as the page unloads. It has to go out as text/plain:
        // a JSON content type makes the request non-simple, and the cross-origin preflight
        // that then applies cannot complete while the page is going away. So the body
        // arrives as an unparsed string and Laravel's input bag is empty.
        if (! $request->isJson() && trim((string) $request->getContent()) !== '') {
            $decoded = json_decode((string) $request->getContent(), true);

            if (is_array($decoded)) {
                $request->merge($decoded);
            }
        }

        $data = $request->validate([
            'outcome' => ['required', 'string', 'in:'.implode(',', AiConversation::OUTCOMES)],
            'detail' => ['nullable', 'string', 'max:160'],
        ]);

        $conversation = AiConversation::query()
            ->where('access_token_hash', hash('sha256', $token))
            ->where('expires_at', '>', now())
            ->first();

        // An expired or unknown token is not an error worth surfacing to a beacon.
        if (! $conversation) {
            return response()->json(['status' => 'ok'], 202);
        }

        $conversation->recordOutcome($data['outcome'], $data['detail'] ?? null);

        return response()->json(['status' => 'ok']);
    }

    /** @param  array<string,mixed>  $context */
    private function conversation(?string $token, array $context = []): array
    {
        if ($token) {
            return [AiConversation::query()->where('access_token_hash', hash('sha256', $token))->where('status', 'active')->where('expires_at', '>', now())->first(), null];
        }
        $plain = Str::random(64);

        return [AiConversation::create([
            'access_token_hash' => hash('sha256', $plain),
            'status' => 'active',
            'expires_at' => now()->addDays(30),
            'entry_source' => $context['entry_source'] ?? null,
            'entry_label' => $context['entry_label'] ?? null,
            'entry_path' => $context['entry_path'] ?? null,
        ]), $plain];
    }
}
