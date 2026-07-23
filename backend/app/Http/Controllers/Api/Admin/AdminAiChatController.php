<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiConversation;
use App\Models\AiMessage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only window into what users actually ask the SocietyFlats AI assistant.
 * Conversations are anonymous (token-hash only, no PII stored), so this exposes
 * message content and matched entities for product insight — never identity.
 */
class AdminAiChatController extends Controller
{
    /** List recent conversations with a preview of the first user question. */
    public function index(Request $request): JsonResponse
    {
        $days = max(1, min((int) $request->integer('days', 30), 90));
        $limit = max(1, min((int) $request->integer('limit', 50), 200));

        $since = now()->subDays($days);

        $conversations = AiConversation::query()
            ->where('last_message_at', '>=', $since)
            ->withCount('messages')
            ->orderByDesc('last_message_at')
            ->limit($limit)
            ->get(['id', 'status', 'model', 'last_message_at', 'created_at']);

        $totalConversations = AiConversation::query()->where('last_message_at', '>=', $since)->count();
        $totalMessages = AiMessage::query()->where('created_at', '>=', $since)->count();
        $userMessages = AiMessage::query()->where('created_at', '>=', $since)->where('role', 'user')->count();

        return response()->json([
            'status' => 'ok',
            'data' => [
                'summary' => [
                    'window_days' => $days,
                    'conversations' => $totalConversations,
                    'messages' => $totalMessages,
                    'user_questions' => $userMessages,
                ],
                'conversations' => $conversations->map(function (AiConversation $conversation) {
                    $firstQuestion = $conversation->messages()
                        ->where('role', 'user')
                        ->oldest()
                        ->value('content');

                    return [
                        'id' => $conversation->id,
                        'status' => $conversation->status,
                        'model' => $conversation->model,
                        'message_count' => $conversation->messages_count,
                        'preview' => $firstQuestion ? mb_strimwidth((string) $firstQuestion, 0, 140, '…') : null,
                        'last_message_at' => $conversation->last_message_at?->toIso8601String(),
                        'created_at' => $conversation->created_at?->toIso8601String(),
                    ];
                })->values(),
            ],
        ]);
    }

    /** Full transcript for a single conversation. */
    public function show(AiConversation $conversation): JsonResponse
    {
        $messages = $conversation->messages()
            ->oldest()
            ->get(['id', 'role', 'content', 'context_entities', 'created_at']);

        return response()->json([
            'status' => 'ok',
            'data' => [
                'conversation' => [
                    'id' => $conversation->id,
                    'status' => $conversation->status,
                    'model' => $conversation->model,
                    'message_count' => $messages->count(),
                    'last_message_at' => $conversation->last_message_at?->toIso8601String(),
                    'created_at' => $conversation->created_at?->toIso8601String(),
                ],
                'messages' => $messages->map(fn (AiMessage $message) => [
                    'id' => $message->id,
                    'role' => $message->role,
                    'content' => $message->content,
                    'context_entities' => $message->context_entities,
                    'created_at' => $message->created_at?->toIso8601String(),
                ])->values(),
            ],
        ]);
    }
}
