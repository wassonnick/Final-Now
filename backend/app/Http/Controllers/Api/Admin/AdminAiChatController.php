<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AiConversation;
use App\Models\AiMessage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Read-only window into what users actually ask the SocietyFlats AI assistant.
 * Conversations are anonymous (token-hash only, no PII stored), so this exposes
 * message content, entry context and outcome for product insight — never identity.
 */
class AdminAiChatController extends Controller
{
    /** List recent conversations with a preview of the first user question. */
    public function index(Request $request): JsonResponse
    {
        $days = max(1, min((int) $request->integer('days', 30), 90));
        $limit = max(1, min((int) $request->integer('limit', 50), 200));

        $since = now()->subDays($days);

        $userTurns = ['messages as user_turns' => fn ($q) => $q->where('role', 'user')];

        $conversations = AiConversation::query()
            ->where('last_message_at', '>=', $since)
            ->withCount(array_merge(['messages'], $userTurns))
            ->orderByDesc('last_message_at')
            ->limit($limit)
            ->get(['id', 'status', 'model', 'last_message_at', 'created_at', 'entry_source', 'entry_label', 'entry_path', 'entry_referrer', 'outcome', 'outcome_detail', 'ended_at']);

        $inWindow = fn () => AiConversation::query()->where('last_message_at', '>=', $since);

        $totalConversations = $inWindow()->count();
        $totalMessages = AiMessage::query()->where('created_at', '>=', $since)->count();
        $userMessages = AiMessage::query()->where('created_at', '>=', $since)->where('role', 'user')->count();

        // The engagement question this page exists to answer: how many conversations got
        // past a single question, and how many reached something that matters to the
        // business (a society opened, or a callback/visit started).
        $depth = $inWindow()->withCount($userTurns)->get(['id'])->countBy(
            fn ($c) => $c->user_turns <= 1 ? 'one_shot' : ($c->user_turns <= 3 ? 'short' : 'engaged')
        );
        $continued = $totalConversations - (int) ($depth['one_shot'] ?? 0);
        $converted = $inWindow()->whereIn('outcome', ['society_opened', 'lead_started'])->count();

        return response()->json([
            'status' => 'ok',
            'data' => [
                'summary' => [
                    'window_days' => $days,
                    'conversations' => $totalConversations,
                    'messages' => $totalMessages,
                    'user_questions' => $userMessages,
                    'one_shot' => (int) ($depth['one_shot'] ?? 0),
                    'continued' => $continued,
                    'continued_rate' => $totalConversations > 0 ? round($continued / $totalConversations * 100, 1) : 0.0,
                    'converted' => $converted,
                    'converted_rate' => $totalConversations > 0 ? round($converted / $totalConversations * 100, 1) : 0.0,
                    'avg_user_turns' => $totalConversations > 0 ? round($userMessages / $totalConversations, 2) : 0.0,
                ],
                'depth' => [
                    'one_shot' => (int) ($depth['one_shot'] ?? 0),
                    'short' => (int) ($depth['short'] ?? 0),
                    'engaged' => (int) ($depth['engaged'] ?? 0),
                ],
                'entry_sources' => $this->breakdown($inWindow(), 'entry_source', $totalConversations),
                'entry_labels' => $this->breakdown($inWindow(), 'entry_label', $totalConversations),
                'outcomes' => $this->breakdown($inWindow(), 'outcome', $totalConversations),
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
                        'user_turns' => $conversation->user_turns,
                        'entry_source' => $conversation->entry_source,
                        'entry_label' => $conversation->entry_label,
                        'entry_path' => $conversation->entry_path,
                        'entry_referrer' => $conversation->entry_referrer,
                        'outcome' => $conversation->outcome,
                        'outcome_detail' => $conversation->outcome_detail,
                        'ended_at' => $conversation->ended_at?->toIso8601String(),
                        'preview' => $firstQuestion ? mb_strimwidth((string) $firstQuestion, 0, 140, '…') : null,
                        'last_message_at' => $conversation->last_message_at?->toIso8601String(),
                        'created_at' => $conversation->created_at?->toIso8601String(),
                    ];
                })->values(),
            ],
        ]);
    }

    /**
     * Count conversations per value of a journey column, largest first. Nulls become
     * "unknown" — chats that started before tracking shipped, or ones the browser
     * closed before any exit beacon fired.
     *
     * @param  Builder<AiConversation>  $query
     * @return array<int,array{key:string,count:int,share:float}>
     */
    private function breakdown($query, string $column, int $total): array
    {
        return $query->selectRaw("COALESCE($column, 'unknown') as key, COUNT(*) as total")
            ->groupBy('key')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'key' => (string) $row->key,
                'count' => (int) $row->total,
                'share' => $total > 0 ? round((int) $row->total / $total * 100, 1) : 0.0,
            ])
            ->values()
            ->all();
    }

    /** Full transcript for a single conversation. */
    public function show(AiConversation $conversation): JsonResponse
    {
        $messages = $conversation->messages()
            ->oldest()
            ->get(['id', 'role', 'content', 'context_entities', 'suggested_replies', 'created_at']);

        return response()->json([
            'status' => 'ok',
            'data' => [
                'conversation' => [
                    'id' => $conversation->id,
                    'status' => $conversation->status,
                    'model' => $conversation->model,
                    'message_count' => $messages->count(),
                    'entry_source' => $conversation->entry_source,
                    'entry_label' => $conversation->entry_label,
                    'entry_path' => $conversation->entry_path,
                    'entry_referrer' => $conversation->entry_referrer,
                    'outcome' => $conversation->outcome,
                    'outcome_detail' => $conversation->outcome_detail,
                    'ended_at' => $conversation->ended_at?->toIso8601String(),
                    'last_message_at' => $conversation->last_message_at?->toIso8601String(),
                    'created_at' => $conversation->created_at?->toIso8601String(),
                ],
                'messages' => $messages->map(fn (AiMessage $message) => [
                    'id' => $message->id,
                    'role' => $message->role,
                    'content' => $message->content,
                    'context_entities' => $message->context_entities,
                    'suggested_replies' => $message->suggested_replies,
                    'created_at' => $message->created_at?->toIso8601String(),
                ])->values(),
            ],
        ]);
    }
}
