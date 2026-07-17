<?php

namespace App\Services;

use App\Models\Society;
use App\Models\SocietyComparePage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Rewrites a compare page's editorial copy (intro, summary, verdict, FAQs, per-society
 * blurbs) with AI so every page reads unique instead of template-shaped. Strictly grounded:
 * the prompt carries only published, admin-reviewed data and forbids invented facts. The
 * deterministic generator copy is the permanent fallback — pages read fine if AI is
 * unavailable, and a stale rebuild resets to deterministic copy until the next enhancement.
 */
class SocietyCompareAiCopyService
{
    public const OUTPUT_KEYS = ['intro', 'comparison_summary', 'recommendation_copy', 'faq_json', 'society_blurbs'];

    public function isAvailable(): bool
    {
        return $this->provider() === 'claude'
            ? trim((string) config('services.claude.api_key', '')) !== ''
            : trim((string) config('services.gemini.api_key', '')) !== '';
    }

    public function model(): string
    {
        return $this->provider() === 'claude'
            ? (trim((string) config('services.claude.model', 'claude-haiku-4-5')) ?: 'claude-haiku-4-5')
            : (trim((string) config('services.gemini.model', 'gemini-2.0-flash')) ?: 'gemini-2.0-flash');
    }

    /** @return array{intro:?string,comparison_summary:?string,recommendation_copy:?string,faq_json:array,society_blurbs:array<string,string>} */
    public function enhance(SocietyComparePage $page): array
    {
        if (! $this->isAvailable()) {
            throw new RuntimeException('Compare AI copy is not configured. Add the existing Gemini or Claude API key on the backend.');
        }

        $prompt = $this->prompt($page);
        $raw = $this->provider() === 'claude' ? $this->claude($prompt) : $this->gemini($prompt);

        return $this->normalize($raw);
    }

    private function provider(): string
    {
        $configured = strtolower((string) config('services.ai_import_provider', 'gemini'));

        return $configured === 'claude' ? 'claude' : 'gemini';
    }

    private function prompt(SocietyComparePage $page): string
    {
        $societies = collect([$page->societyA, $page->societyB, $page->societyC])->filter()->map(fn (Society $s) => [
            'name' => $s->name,
            'slug' => $s->slug,
            'sector' => $s->sector,
            'locality' => $s->locality,
            'builder' => $s->builder,
            'project_status' => $s->project_status,
            'overall_score' => $s->score ? round((float) $s->score, 1) : null,
            'connectivity_score' => $s->connectivity_score ? round((float) $s->connectivity_score, 1) : null,
            'lifestyle_score' => $s->lifestyle_score ? round((float) $s->lifestyle_score, 1) : null,
            'rent_range' => $s->rent_range,
            'buy_range' => $s->buy_range,
            'amenities' => collect($s->amenities ?: [])->take(10)->values()->all(),
            'nearby_metro' => collect($s->nearby_metro ?: [])->take(3)->values()->all(),
            'nearby_schools' => collect($s->nearby_schools ?: [])->take(3)->values()->all(),
            'nearby_office_hubs' => collect($s->nearby_office_hubs ?: [])->take(3)->values()->all(),
        ])->values()->all();

        $shape = [
            'intro' => '',
            'comparison_summary' => '',
            'recommendation_copy' => '',
            'faq_json' => [],
            'society_blurbs' => new \stdClass(),
        ];

        return "Rewrite the editorial copy for a SocietyFlats 3-way society comparison page ({$page->title}) for a Gurgaon renter or buyer deciding between these societies.\n\n"
            ."VOICE & TONE (SocietyFlats brand — match it exactly):\n- Warm, human and reassuring, like a knowledgeable local friend helping you choose — never corporate, robotic or salesy.\n- Short, clear sentences; no hype, no exclamation marks, no clichés ('nestled', 'dream home', 'prime location').\n- Compare honestly: name real trade-offs between the three (commute vs space, price vs polish) where the data supports them. A useful comparison takes positions the data can defend.\n- Address the reader as 'you'.\n\n"
            ."STRICT SAFETY RULES (override tone if they ever conflict):\n- Use only the supplied societies JSON. Never invent prices, distances, amenities, possession dates, ratings or availability.\n- Quote scores and market ranges exactly as supplied; if a value is missing, skip that claim.\n- Never declare a single absolute winner — recommend by use-case (budget, commute, family) grounded in the data.\n- Do not promise appreciation, yield or availability.\n- Output valid JSON only with exactly the requested keys.\n\n"
            ."WHAT TO WRITE:\n- intro: ~90-120 words setting up this specific three-way choice — what actually differentiates these societies.\n- comparison_summary: ~60-90 words with the sharpest data-backed contrasts.\n- recommendation_copy: ~50-80 words of use-case guidance (who should shortlist which), ending by suggesting a verified availability check.\n- faq_json: 3-4 question/answer pairs a real searcher would ask about this specific trio, answered from the data.\n- society_blurbs: object keyed by society slug, one ~40-60 word blurb per society capturing how it lives day to day.\n\n"
            .'SOCIETIES JSON: '.json_encode($societies, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n"
            .'EXISTING DETERMINISTIC COPY TO IMPROVE ON (do not copy its phrasing): '.json_encode([
                'intro' => $page->intro, 'comparison_summary' => $page->comparison_summary,
            ], JSON_UNESCAPED_UNICODE)."\n"
            .'OUTPUT SHAPE: '.json_encode($shape, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }

    private function gemini(string $prompt): array
    {
        $response = Http::timeout(45)->withHeaders(['x-goog-api-key' => trim((string) config('services.gemini.api_key', '')), 'Content-Type' => 'application/json'])
            ->post('https://generativelanguage.googleapis.com/v1beta/models/'.$this->model().':generateContent', [
                'systemInstruction' => ['parts' => [['text' => 'You write SocietyFlats comparison copy in a warm, human, premium-but-honest voice. Use only the supplied data, add no facts of your own, and return valid JSON only.']]],
                'contents' => [['role' => 'user', 'parts' => [['text' => $prompt]]]],
                'generationConfig' => ['temperature' => 0.4, 'responseMimeType' => 'application/json'],
            ]);
        if (! $response->successful()) {
            throw new RuntimeException('Gemini compare copy request failed with HTTP '.$response->status().'.');
        }
        $text = collect(data_get($response->json(), 'candidates.0.content.parts', []))->pluck('text')->filter()->join("\n");

        return $this->decode($text);
    }

    private function claude(string $prompt): array
    {
        $client = new \Anthropic\Client(apiKey: trim((string) config('services.claude.api_key', '')));
        $message = $client->messages->create(
            maxTokens: 3000,
            messages: [['role' => 'user', 'content' => $prompt]],
            model: $this->model(),
            system: 'You write SocietyFlats comparison copy in a warm, human, premium-but-honest voice — like a knowledgeable local friend helping someone choose between societies. Use only the supplied data, add no facts of your own, and return valid JSON only.',
        );
        $text = collect($message->content)->filter(fn ($block) => $block->type === 'text')->map(fn ($block) => $block->text)->join("\n");

        return $this->decode($text);
    }

    private function decode(string $text): array
    {
        $clean = trim(Str::of($text)->replaceMatches('/^```(?:json)?\s*|\s*```$/i', '')->toString());
        $decoded = json_decode($clean, true);
        if (! is_array($decoded)) {
            throw new RuntimeException('AI returned invalid compare copy JSON.');
        }

        return $decoded;
    }

    private function normalize(array $raw): array
    {
        $copy = [];
        foreach (['intro', 'comparison_summary', 'recommendation_copy'] as $key) {
            $value = trim((string) ($raw[$key] ?? ''));
            $copy[$key] = $value !== '' ? $value : null;
        }
        $copy['faq_json'] = collect(is_array($raw['faq_json'] ?? null) ? $raw['faq_json'] : [])
            ->filter(fn ($item) => is_array($item) && filled($item['question'] ?? null) && filled($item['answer'] ?? null))
            ->map(fn ($item) => ['question' => trim((string) $item['question']), 'answer' => trim((string) $item['answer'])])
            ->values()->all();
        $copy['society_blurbs'] = collect(is_array($raw['society_blurbs'] ?? null) ? $raw['society_blurbs'] : [])
            ->mapWithKeys(fn ($blurb, $slug) => [trim((string) $slug) => trim((string) $blurb)])
            ->filter(fn ($blurb, $slug) => $slug !== '' && $blurb !== '')
            ->all();

        if ($copy['intro'] === null && $copy['comparison_summary'] === null && $copy['faq_json'] === []) {
            throw new RuntimeException('The AI provider returned no usable compare copy fields.');
        }

        return $copy;
    }
}
