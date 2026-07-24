<?php

namespace App\Services\Ai;

use App\Exceptions\AiProviderLimitException;
use App\Models\AiConversation;
use App\Services\Ops\AiBudgetGuard;
use App\Services\Ops\AiSpendTracker;
use Illuminate\Support\Facades\Log;

/**
 * The real conversational assistant. Claude reasons over the user's needs and calls a
 * `search_societies` tool (the deterministic SocietyMatchService) to ground every specific
 * claim in published, verified data — so it feels like a knowledgeable local expert while
 * never inventing a society, price or availability. Multi-turn memory comes from the
 * AiConversation history; the daily budget guard + provider circuit-breaker keep cost sane.
 */
class SocietyAssistantService
{
    private const MAX_TOOL_TURNS = 4;

    public function __construct(
        private readonly SocietyMatchService $matcher,
        private readonly AiBudgetGuard $budget,
        private readonly AiSpendTracker $spendTracker,
    ) {
    }

    public function isAvailable(): bool
    {
        return trim((string) config('services.claude.api_key', '')) !== '';
    }

    /**
     * Produce an assistant reply for a new user message within a conversation.
     *
     * @return array{reply:string,matches:array<int,array<string,mixed>>,provider:string}
     */
    public function reply(AiConversation $conversation, string $message): array
    {
        if (! $this->isAvailable()) {
            return $this->fallback('The assistant is briefly offline. You can still browse verified societies in search, or request a callback and our team will help.');
        }
        if ($this->budget->providerLimited() || ! $this->budget->allow()) {
            return $this->fallback('The assistant is resting for a moment to stay within today\'s limits. Please try again shortly, or browse verified societies in search.');
        }

        $model = trim((string) config('services.claude.assistant_model'))
            ?: (trim((string) config('services.claude.model', 'claude-haiku-4-5')) ?: 'claude-haiku-4-5');

        $messages = $this->history($conversation);
        $messages[] = ['role' => 'user', 'content' => $message];

        $tools = [[
            'name' => 'search_societies',
            'description' => 'Search SocietyFlats\' verified, published Gurgaon societies and rank the best fits for the user. Call this whenever the user asks for recommendations or mentions specifics (budget, BHK, sector, commute, family, pets, amenities). Returns only real published societies with their scores, rent/buy ranges and why each fits — never invent societies outside this tool\'s results.',
            'input_schema' => [
                'type' => 'object',
                'properties' => [
                    'intent' => ['type' => 'string', 'enum' => ['rent', 'buy', 'resale'], 'description' => 'Whether the user wants to rent, buy or resale.'],
                    'budget' => ['type' => 'integer', 'description' => 'Budget in rupees. Monthly for rent (e.g. 80000), total for buy (e.g. 25000000). Omit if unknown.'],
                    'bhk' => ['type' => 'integer', 'description' => 'Bedrooms wanted (1-5). Omit if unknown.'],
                    'locations' => ['type' => 'array', 'items' => ['type' => 'string'], 'description' => 'Preferred sectors/roads, e.g. ["sector 65","golf course road"].'],
                    'priorities' => ['type' => 'array', 'items' => ['type' => 'string', 'enum' => ['family', 'pet_friendly', 'metro', 'office_access', 'luxury', 'value']], 'description' => 'What matters to the user.'],
                    'keywords' => ['type' => 'array', 'items' => ['type' => 'string'], 'description' => 'Builder names or free terms to match, e.g. ["m3m","clubhouse"].'],
                    'free_text' => ['type' => 'string', 'description' => 'The user\'s requirement in their own words, as a fallback for matching.'],
                ],
            ],
        ]];

        try {
            $result = $this->runToolLoop($model, $messages, $tools, (int) $conversation->id);
        } catch (AiProviderLimitException $e) {
            $this->budget->tripProviderLimit();

            return $this->fallback('The assistant has reached today\'s usage limit. Please try again later, or browse verified societies in search.');
        } catch (\Throwable $e) {
            Log::warning('Society assistant failed', ['conversation_id' => $conversation->id, 'error' => $e->getMessage()]);

            return $this->fallback('I hit a snag composing that answer. The verified matches below are still safe to browse — nothing here is invented.');
        }

        if (trim($result['reply']) === '') {
            $result['reply'] = 'Here are the closest verified matches I could find. Open any one to see full details, or tell me a bit more and I\'ll refine.';
        }

        return ['reply' => $result['reply'], 'matches' => array_values($result['matches']), 'provider' => 'claude'];
    }

    /**
     * @param  array<int,array<string,mixed>>  $messages
     * @param  array<int,array<string,mixed>>  $tools
     * @return array{reply:string,matches:array<int,array<string,mixed>>}
     */
    private function runToolLoop(string $model, array $messages, array $tools, int $conversationId): array
    {
        $client = new \Anthropic\Client(apiKey: trim((string) config('services.claude.api_key', '')));
        $matches = [];
        $reply = '';

        for ($turn = 0; $turn < self::MAX_TOOL_TURNS; $turn++) {
            if (! $this->budget->allow()) {
                break;
            }
            $this->budget->record();

            try {
                $response = $client->messages->create(
                    maxTokens: 1500,
                    messages: $messages,
                    model: $model,
                    system: $this->systemPrompt(),
                    tools: $tools,
                );
                $this->spendTracker->recordAnthropicText('ai_assistant', 'chat_reply_turn', $model, $response, [
                    'subject_type' => 'ai_conversation',
                    'subject_id' => $conversationId,
                    'metadata' => ['turn' => $turn + 1],
                ]);
            } catch (\Anthropic\Core\Exceptions\APIStatusException $e) {
                $this->spendTracker->recordFailure('anthropic', 'ai_assistant', 'chat_reply_turn', $model, $e, [
                    'subject_type' => 'ai_conversation',
                    'subject_id' => $conversationId,
                    'metadata' => ['turn' => $turn + 1],
                ]);
                if (in_array((int) ($e->status ?? 0), [402, 429], true)) {
                    throw new AiProviderLimitException('Assistant hit provider limit: '.$e->getMessage(), 0, $e);
                }
                throw $e;
            }

            $assistantContent = [];
            $toolResults = [];
            $turnText = '';

            foreach ($response->content as $block) {
                if ($block->type === 'text') {
                    $turnText .= $block->text;
                    $assistantContent[] = ['type' => 'text', 'text' => $block->text];
                } elseif ($block->type === 'tool_use') {
                    $input = json_decode(json_encode($block->input), true) ?: [];
                    $assistantContent[] = ['type' => 'tool_use', 'id' => $block->id, 'name' => $block->name, 'input' => $input];
                    $search = $this->matcher->searchStructured($input);
                    foreach ($search['matches'] as $m) {
                        $matches[$m['id']] = $m;
                    }
                    $toolResults[] = [
                        'type' => 'tool_result',
                        'tool_use_id' => $block->id,
                        'content' => json_encode($this->compactMatches($search['matches']), JSON_UNESCAPED_UNICODE),
                    ];
                }
            }

            if ($turnText !== '') {
                $reply = $turnText;
            }

            $messages[] = ['role' => 'assistant', 'content' => $assistantContent];

            if (($response->stopReason ?? null) === 'tool_use' && $toolResults !== []) {
                $messages[] = ['role' => 'user', 'content' => $toolResults];

                continue;
            }

            break;
        }

        return ['reply' => $reply, 'matches' => $matches];
    }

    /** Trim tool results to the fields the model needs, to keep the context tight. */
    private function compactMatches(array $matches): array
    {
        return collect($matches)->map(fn ($m) => [
            'name' => $m['society_name'],
            'sector' => $m['sector'],
            'score' => $m['score'],
            'rent_range' => $m['rent_range'],
            'buy_range' => $m['buy_range'],
            'available_homes' => $m['available_homes'],
            'why' => $m['reason'],
            'url' => $m['url'],
        ])->values()->all();
    }

    /** @return array<int,array{role:string,content:string}> */
    private function history(AiConversation $conversation): array
    {
        return $conversation->messages()
            ->latest()->limit(12)->get()->reverse()
            ->map(fn ($m) => ['role' => $m->role === 'assistant' ? 'assistant' : 'user', 'content' => (string) $m->content])
            ->values()->all();
    }

    private function systemPrompt(): string
    {
        return <<<'PROMPT'
You are the SocietyFlats assistant — a warm, sharp, genuinely helpful guide to renting or buying a home in Gurgaon. You sound like a knowledgeable local friend, not a corporate bot: calm, confident, concise. No hype, no clichés.

HOW YOU WORK
- ALWAYS call the `search_societies` tool before answering anything about a specific society, builder, sector, budget, BHK or commute — even when the user just names a society ("tell me about M3M Escala", "Central Park Group"). Put the society/builder name into `keywords` and the raw request into `free_text` so the tool can find it. The tool searches ALL verified published societies, not a shortlist.
- Only ever name or describe societies the tool returned. Never invent a society, price, distance or availability.
- CRUCIAL: only say a society "isn't in our database" if the tool genuinely returned nothing for that name. If the tool returned it, describe it confidently — never tell a user we don't have a society we actually have. When a name has no match, assume a spelling variant first: offer the closest verified matches the tool did return, and offer to have the team confirm — don't dead-end.
- Ground specific claims in the tool data. If you don't have a detail (exact possession date, a school's distance), say "I don't have that confirmed yet — our team can" rather than guessing.

HOW YOU TALK
- Lead with a short, human read of their need. When they named a specific society the tool found, open with a confident one-paragraph read of it (its score, what it's known for, budget context), then compare 1–2 genuine alternatives.
- Otherwise recommend 2–4 societies, each with a one-line reason grounded in the data. Keep it skimmable — a few short paragraphs, never a spec sheet.
- Ask ONE natural clarifying question only when it genuinely sharpens the shortlist. Don't interrogate, and never open with a wall of questions before giving value.

DRIVE THE NEXT STEP (every reply ends with one)
- Each society the tool returns comes with its profile link (its `url`). Invite the user to open it for full verified details, photos and the score breakdown — refer to it naturally ("open M3M Escala's profile").
- Close with ONE low-friction, helpful next step that moves them toward our team or a visit: offer to arrange a free callback for exact current availability and pricing, or to line up a site visit. Frame it as help, not a sales push. This is how we turn a chat into a real enquiry — always include it.
- You cannot give legal, tax or investment guarantees; for those, and for a visit, point them to a callback with our team.
PROMPT;
    }

    /** @return array{reply:string,matches:array<int,array<string,mixed>>,provider:string} */
    private function fallback(string $reply): array
    {
        return ['reply' => $reply, 'matches' => [], 'provider' => 'safe_fallback'];
    }
}
