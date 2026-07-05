<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class SocietyAiEnrichmentService
{
    public function provider(): string
    {
        return strtolower((string) config('services.ai_import_provider', 'gemini'));
    }

    public function isAvailable(): bool
    {
        if ($this->provider() === 'claude') {
            return trim((string) config('services.claude.api_key', '')) !== '';
        }

        if ($this->provider() !== 'gemini') {
            return false;
        }

        return trim((string) config('services.gemini.api_key', '')) !== '';
    }

    public function status(): array
    {
        if ($this->provider() === 'claude') {
            return [
                'provider' => 'claude',
                'available' => $this->isAvailable(),
                'model' => (string) config('services.claude.model', 'claude-haiku-4-5'),
                'grounding' => (bool) config('services.claude.import_grounding', true),
            ];
        }

        return [
            'provider' => $this->provider(),
            'available' => $this->isAvailable(),
            'model' => (string) config('services.gemini.model', 'gemini-2.0-flash'),
            'grounding' => (bool) config('services.gemini.import_grounding', false),
        ];
    }

    public function enrichSociety(string $name, string $context = '', string $source = '', bool $findImageCandidate = false, bool $useSearchGrounding = false): array
    {
        if (! $this->isAvailable()) {
            return [];
        }

        if ($this->provider() === 'claude') {
            return $this->enrichWithClaude($name, $context, $source, $findImageCandidate, $useSearchGrounding);
        }

        if ($this->provider() !== 'gemini') {
            return [];
        }

        return $this->enrichWithGemini($name, $context, $source, $findImageCandidate, $useSearchGrounding);
    }

    private function marketPrompt(string $name, string $sector, string $city): string
    {
        $location = trim($sector.' '.$city);
        $year = now()->year;

        return <<<PROMPT
You are pricing ONE specific Gurgaon residential project from CURRENTLY LISTED units on India's major property portals. Accuracy against those portals is the whole job.

Project: {$name}
Location: {$location}

METHOD — do this, do not shortcut:
1. Run separate searches for this exact project on each major portal. Use queries like:
   - "{$name} {$sector} 99acres price for sale"
   - "{$name} {$sector} magicbricks resale price"
   - "{$name} {$sector} housing.com rent"
   - "{$name} {$sector} squareyards price per sqft"
   - "{$name} {$sector} nobroker rent"
   Also try the project name without the sector if the first pass is thin.
2. Read the ACTIVE listings (units currently for sale / for rent) — NOT sector-wide averages, NOT a single old article, NOT a builder's original launch price. Prefer listings and price pages updated within the last 12 months ({$year} or late last year).
3. Build each range from the SPREAD of current listings across configurations: buy_range = lowest currently-listed resale price to the highest; rent_range = lowest current asking rent to the highest; price_per_sqft = the current ₹/sqft band those listings imply.
4. Cross-check across at least two portals. If portals disagree, widen the range to cover both rather than picking one. If you can only find one stale figure, mark confidence "low" and say so.

Return ONLY this JSON object, no markdown fences, no commentary:
{
  "rent_range": "ONLY a short range, e.g. '₹X - ₹Y per month', spanning current asking rents. Never add parentheticals or configuration breakdowns. Null if no current project-specific listings found.",
  "buy_range": "ONLY a short range, e.g. '₹X Cr - ₹Y Cr', spanning current resale listings. Never add parentheticals or configuration breakdowns. Null if none found.",
  "price_per_sqft": "current ₹/sqft band, e.g. '₹X,XXX - ₹Y,YYY', or null",
  "rental_yield": "string e.g. X.X%, or null",
  "average_rent": "single representative current asking rent, or null",
  "average_sale_price": "single representative current resale price, or null",
  "confidence": "high (2+ portals agree, recent) | medium (one solid recent portal) | low (thin or stale)",
  "notes": "name the portals you actually found figures on and how recent they were, e.g. '99acres + magicbricks resale listings, 2026'"
}

Never invent numbers. Never carry over the builder's launch price as the current resale price. Use null for any field you cannot support with current listings for THIS specific project.
PROMPT;
    }

    /**
     * Scoped market-data lookup: researches only rent/buy/psf/yield for one named
     * project, with citations, leaving every other field untouched. Prefers Claude
     * (no daily quota) when ANTHROPIC_API_KEY is set; otherwise falls back to
     * Gemini's grounded search, which is subject to its 20 req/day free-tier quota.
     */
    public function enrichMarketDataOnly(string $name, string $sector = '', string $city = 'Gurugram'): array
    {
        $claudeKey = trim((string) config('services.claude.api_key', ''));

        if ($claudeKey !== '') {
            return $this->enrichMarketDataOnlyClaude($name, $sector, $city, $claudeKey);
        }

        return $this->enrichMarketDataOnlyGemini($name, $sector, $city);
    }

    /** Property portals whose current listings we price against. */
    private const MARKET_PORTAL_DOMAINS = [
        '99acres.com', 'magicbricks.com', 'housing.com', 'squareyards.com', 'nobroker.in', 'proptiger.com',
    ];

    private function enrichMarketDataOnlyClaude(string $name, string $sector, string $city, string $apiKey): array
    {
        // Pass 1: restrict the search to the real property portals so the model reads
        // current listings, never a stale blog or the builder's launch price. If that
        // finds no project-specific figure, pass 2 opens the search for coverage.
        $restricted = $this->runClaudeMarketSearch($name, $sector, $city, $apiKey, self::MARKET_PORTAL_DOMAINS);
        if (isset($restricted['_ai_error']) || $this->hasMarketFigure($restricted)) {
            return $restricted;
        }

        $open = $this->runClaudeMarketSearch($name, $sector, $city, $apiKey, null);

        return isset($open['_ai_error']) ? $restricted : $open;
    }

    /**
     * @param  array<int,string>|null  $allowedDomains  Restrict the web search to these
     *                                                   domains, or null for an open search.
     */
    private function runClaudeMarketSearch(string $name, string $sector, string $city, string $apiKey, ?array $allowedDomains): array
    {
        $model = trim((string) config('services.claude.model', 'claude-haiku-4-5')) ?: 'claude-haiku-4-5';
        $prompt = $this->marketPrompt($name, $sector, $city);

        $tool = (new \Anthropic\Messages\WebSearchTool20260209())->withMaxUses(8)->withAllowedCallers(['direct']);
        if ($allowedDomains !== null) {
            $tool = $tool->withAllowedDomains($allowedDomains);
        }

        try {
            $client = new \Anthropic\Client(apiKey: $apiKey);

            $message = $client->messages->create(
                maxTokens: 2048,
                messages: [['role' => 'user', 'content' => $prompt]],
                model: $model,
                system: 'You are an Indian real-estate pricing researcher. Your figures are checked against 99acres, Housing.com and MagicBricks, so they must reflect CURRENT listings on those portals for the exact named project — never a builder launch price, never a sector-wide average, never a stale article. Search each portal, prefer listings from the last 12 months, cross-check at least two, widen the range to cover disagreement, and use null rather than guessing.',
                tools: [$tool],
            );
        } catch (\Anthropic\Core\Exceptions\APIStatusException $e) {
            return ['_ai_error' => 'Claude HTTP '.($e->status ?? 0).': '.$e->getMessage()];
        } catch (\Throwable $e) {
            return ['_ai_error' => $e->getMessage()];
        }

        $text = '';
        $sources = [];

        foreach ($message->content as $block) {
            if ($block->type === 'text') {
                $text .= ($text === '' ? '' : "\n").$block->text;
            } elseif ($block->type === 'web_search_tool_result' && is_array($block->content)) {
                foreach ($block->content as $result) {
                    $url = is_object($result) ? ($result->url ?? null) : ($result['url'] ?? null);
                    $title = is_object($result) ? ($result->title ?? null) : ($result['title'] ?? null);

                    if ($url) {
                        $sources[] = ['title' => $title, 'url' => $url];
                    }
                }
            }
        }

        if (trim($text) === '') {
            return ['_ai_error' => 'Claude returned empty text (stop reason: '.(string) ($message->stopReason ?? 'unknown').')'];
        }

        $data = $this->parseJson($text);
        $data['market_sources'] = collect($sources)->unique('url')->values()->all();

        return $data;
    }

    /** True when the AI result carries at least one usable rent or buy figure. */
    private function hasMarketFigure(array $data): bool
    {
        foreach (['rent_range', 'buy_range', 'average_rent', 'average_sale_price', 'price_per_sqft'] as $field) {
            if (! empty($data[$field]) && trim((string) $data[$field]) !== '' && strtolower(trim((string) $data[$field])) !== 'null') {
                return true;
            }
        }

        return false;
    }

    private function enrichMarketDataOnlyGemini(string $name, string $sector, string $city): array
    {
        $apiKey = trim((string) config('services.gemini.api_key', ''));
        $model = trim((string) config('services.gemini.model', 'gemini-2.0-flash')) ?: 'gemini-2.0-flash';

        if ($apiKey === '') {
            return ['_ai_error' => 'Neither ANTHROPIC_API_KEY nor GEMINI_API_KEY is configured on the backend.'];
        }

        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";
        $prompt = $this->marketPrompt($name, $sector, $city);

        try {
            $response = Http::timeout(30)
                ->withHeaders(['x-goog-api-key' => $apiKey, 'Content-Type' => 'application/json'])
                ->post($endpoint, [
                    'systemInstruction' => [
                        'parts' => [['text' => 'You are a careful Indian real-estate market research assistant. Only report figures you can support from search results for the exact named project. Use null when unsure.']],
                    ],
                    'contents' => [['role' => 'user', 'parts' => [['text' => $prompt]]]],
                    'tools' => [['google_search' => (object) []]],
                    'generationConfig' => ['temperature' => 0.2],
                ]);
        } catch (\Throwable $e) {
            return ['_ai_error' => $e->getMessage()];
        }

        if (! $response->successful()) {
            $status = $response->status();

            return [
                '_ai_error' => 'Gemini HTTP '.$status,
                '_ai_quota_limited' => $status === 429,
            ];
        }

        $text = collect(data_get($response->json(), 'candidates.0.content.parts', []))
            ->pluck('text')->filter(fn ($part) => is_string($part) && trim($part) !== '')->join("\n");

        if ($text === '') {
            $finishReason = (string) data_get($response->json(), 'candidates.0.finishReason', 'unknown');

            return ['_ai_error' => "Gemini returned empty text (finish: {$finishReason})"];
        }

        $data = $this->parseJson($text);
        $sources = collect(data_get($response->json(), 'candidates.0.groundingMetadata.groundingChunks', []))
            ->map(fn ($chunk) => ['title' => data_get($chunk, 'web.title'), 'url' => data_get($chunk, 'web.uri')])
            ->filter(fn ($source) => $source['url'])->unique('url')->values()->all();
        $data['market_sources'] = $sources;

        return $data;
    }

    private function enrichWithClaude(string $name, string $context = '', string $source = '', bool $findImageCandidate = false, bool $useSearchGrounding = false): array
    {
        $apiKey = trim((string) config('services.claude.api_key', ''));
        $model = trim((string) config('services.claude.model', 'claude-haiku-4-5')) ?: 'claude-haiku-4-5';

        if ($apiKey === '') {
            return [];
        }

        $prompt = $this->buildPrompt($name, $context, $source, $findImageCandidate)
            ."\n\nReturn ONLY the JSON object. No markdown fences, no commentary before or after.";

        try {
            $client = new \Anthropic\Client(apiKey: $apiKey);

            $tools = $useSearchGrounding
                ? [(new \Anthropic\Messages\WebSearchTool20260209())->withMaxUses(3)->withAllowedCallers(['direct'])]
                : null;

            $message = $client->messages->create(
                maxTokens: 4096,
                messages: [['role' => 'user', 'content' => $prompt]],
                model: $model,
                system: 'You are a careful Indian real-estate data extraction assistant for SocietyFlats. Return only factual, review-safe structured JSON. Never invent exact coordinates unless highly confident. Use null when unsure.',
                tools: $tools,
            );
        } catch (\Anthropic\Core\Exceptions\APIStatusException $e) {
            $status = $e->status ?? 0;

            if ($useSearchGrounding && in_array($status, [429, 503, 529], true)) {
                return $this->enrichWithClaude($name, $context."\n\nWeb search grounding was unavailable. Produce the fullest review-safe draft from supplied context and model knowledge; mark unsupported market, distance, legal and image claims in fields_to_verify.", $source, $findImageCandidate, false);
            }

            return [
                '_ai_error' => 'Claude HTTP '.$status.': '.$e->getMessage(),
                '_ai_error_status' => $status,
                '_ai_quota_limited' => $status === 429,
                '_ai_temporarily_unavailable' => in_array($status, [503, 529], true),
            ];
        } catch (\Throwable $e) {
            return [
                '_ai_error' => $e->getMessage(),
                '_ai_error_status' => 0,
            ];
        }

        $text = '';
        $sources = [];

        foreach ($message->content as $block) {
            if ($block->type === 'text') {
                $text .= ($text === '' ? '' : "\n").$block->text;
            } elseif ($block->type === 'web_search_tool_result' && is_array($block->content)) {
                foreach ($block->content as $result) {
                    $url = is_object($result) ? ($result->url ?? null) : ($result['url'] ?? null);
                    $title = is_object($result) ? ($result->title ?? null) : ($result['title'] ?? null);

                    if ($url) {
                        $sources[] = ['title' => $title, 'url' => $url];
                    }
                }
            }
        }

        if (trim($text) === '') {
            $stopReason = (string) ($message->stopReason ?? 'unknown');

            if ($useSearchGrounding) {
                return $this->enrichWithClaude($name, $context."\n\nWeb search grounding returned no final text. Produce the fullest review-safe draft from supplied context and model knowledge; mark unsupported market, distance, legal and image claims in fields_to_verify.", $source, $findImageCandidate, false);
            }

            return [
                '_ai_error' => "Claude returned empty text (stop reason: {$stopReason})",
                '_ai_error_status' => 200,
            ];
        }

        $data = $this->parseJson($text);

        $sources = collect($sources)->unique('url')->values()->all();
        if ($sources !== []) {
            $data['grounding_sources'] = $sources;
        }

        return $data;
    }

    private function enrichWithGemini(string $name, string $context = '', string $source = '', bool $findImageCandidate = false, bool $useSearchGrounding = false): array
    {
        $apiKey = trim((string) config('services.gemini.api_key', ''));
        $model = trim((string) config('services.gemini.model', 'gemini-2.0-flash')) ?: 'gemini-2.0-flash';

        if ($apiKey === '') {
            return [];
        }

        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent";

        $prompt = $this->buildPrompt($name, $context, $source, $findImageCandidate);

        try {
            $response = null;
            $lastError = null;

            foreach ([1, 2, 3] as $attempt) {
                try {
                    $response = Http::timeout(30)
                        ->withHeaders([
                            'x-goog-api-key' => $apiKey,
                            'Content-Type' => 'application/json',
                        ])
                        ->post($endpoint, array_filter([
                            'systemInstruction' => [
                                'parts' => [[
                                    'text' => 'You are a careful Indian real-estate data extraction assistant for SocietyFlats. Return only factual, review-safe structured JSON. Never invent exact coordinates unless highly confident. Use null when unsure.',
                                ]],
                            ],
                            'contents' => [[
                                'role' => 'user',
                                'parts' => [[
                                    'text' => $prompt,
                                ]],
                            ]],
                            'tools' => $useSearchGrounding ? [['google_search' => (object) []]] : null,
                            'generationConfig' => array_filter([
                                'temperature' => 0.2,
                                'responseMimeType' => $useSearchGrounding ? null : 'application/json',
                            ], fn ($value) => $value !== null),
                        ], fn ($value) => $value !== null));
                } catch (\Throwable $e) {
                    // Connection error / timeout (e.g. cURL 28). The grounded + Google Search call
                    // is the slow one, so don't burn more attempts on it — break and let the
                    // grounding fallback below retry on the much faster non-grounded path.
                    $lastError = $e;
                    $response = null;
                    break;
                }

                if ($response->successful()) {
                    break;
                }

                if (! in_array($response->status(), [429, 503], true) || $attempt === 3) {
                    break;
                }

                sleep($attempt * 2);
            }

            if (! $response || ! $response->successful()) {
                $status = $response ? $response->status() : 0;

                if ($useSearchGrounding) {
                    return $this->enrichWithGemini($name, $context."\n\nGoogle Search grounding was unavailable. Produce the fullest review-safe draft from supplied context and model knowledge; mark unsupported market, distance, legal and image claims in fields_to_verify.", $source, $findImageCandidate, false);
                }

                if ($lastError) {
                    return [
                        '_ai_error' => $lastError->getMessage(),
                        '_ai_error_status' => 0,
                        '_ai_temporarily_unavailable' => true,
                    ];
                }

                return [
                    '_ai_error' => 'Gemini HTTP '.$status,
                    '_ai_error_status' => $status,
                    '_ai_quota_limited' => $status === 429,
                    '_ai_temporarily_unavailable' => $status === 503,
                ];
            }

            $text = collect(data_get($response->json(), 'candidates.0.content.parts', []))
                ->pluck('text')->filter(fn ($part) => is_string($part) && trim($part) !== '')->join("\n");

            if ($text === '') {
                $finishReason = (string) data_get($response->json(), 'candidates.0.finishReason', 'unknown');
                $blockReason = (string) data_get($response->json(), 'promptFeedback.blockReason', 'none');

                if ($useSearchGrounding && $blockReason === 'none') {
                    return $this->enrichWithGemini($name, $context."\n\nGoogle Search grounding returned no final text. Produce the fullest review-safe draft from supplied context and model knowledge; mark unsupported market, distance, legal and image claims in fields_to_verify.", $source, $findImageCandidate, false);
                }

                return [
                    '_ai_error' => "Gemini returned empty text (finish: {$finishReason}, block: {$blockReason})",
                    '_ai_error_status' => 200,
                ];
            }

            $data = $this->parseJson($text);
            $sources = collect(data_get($response->json(), 'candidates.0.groundingMetadata.groundingChunks', []))
                ->map(fn ($chunk) => ['title' => data_get($chunk, 'web.title'), 'url' => data_get($chunk, 'web.uri')])
                ->filter(fn ($source) => $source['url'])->unique('url')->values()->all();
            if ($sources !== []) {
                $data['grounding_sources'] = $sources;
            }

            return $data;
        } catch (\Throwable $e) {
            return [
                '_ai_error' => $e->getMessage(),
                '_ai_error_status' => 0,
            ];
        }
    }

    private function buildPrompt(string $name, string $context = '', string $source = '', bool $findImageCandidate = false): string
    {
        $context = Str::limit(trim($context), 14000, '');
        $source = trim($source);
        $imageInstruction = $findImageCandidate
            ? 'Use Google Search grounding to identify the official developer/project page or Google Maps place. Return a direct image URL only when it is clearly an official reusable project image; otherwise return the official gallery/project page as image_reference_url. Never return broker-portal or random image-search URLs.'
            : 'Do not search for an image. Return image fields only when a clearly official image is present in supplied source text.';

        return <<<PROMPT
Create a structured draft society profile for SocietyFlats.com.

Society name:
{$name}

Import source:
{$source}

Source/page text if available:
{$context}

Return ONLY valid JSON. Do not wrap in markdown.

Schema:
{
  "name": "string",
  "builder": "string or null",
  "sector": "string or null",
  "locality": "string or null",
  "city": "Gurugram",
  "state": "Haryana",
  "address": "string or null",
  "description": "120-220 words, factual and review-safe",
  "project_status": "Ready to Move | Under Construction | New Launch | Needs Review | null",
  "possession_date": "Delivered | Ready to Move | Month YYYY | Quarter YYYY | YYYY | Needs Review | null",
  "configuration": "string or null",
  "project_area": "string or null",
  "unit_size_range": "string or null",
  "year_built": "string or null",
  "total_towers": "string or null",
  "total_units": "string or null",
  "maintenance_charges": "ONLY a concrete figure, e.g. '₹4.5 per sq.ft. per month' or '₹15,000 per month'; null if no specific number is found. Never a description of what amenities the maintenance covers.",
  "rent_range": "ONLY a short range, e.g. '₹X - ₹Y per month'. Never add parenthetical context, configuration breakdowns or extra sentences — put that nuance in fields_to_verify instead.",
  "buy_range": "ONLY a short range, e.g. '₹X Cr - ₹Y Cr'. Never add parenthetical context, configuration breakdowns or extra sentences — put that nuance in fields_to_verify instead.",
  "rental_yield": "string or null",
  "average_rent": "string or null",
  "average_sale_price": "string or null",
  "price_per_sqft": "string or null",
  "score": number between 0 and 10 or null,
  "security_score": number between 0 and 10 or null,
  "maintenance_score": number between 0 and 10 or null,
  "connectivity_score": number between 0 and 10 or null,
  "lifestyle_score": number between 0 and 10 or null,
  "investment_score": number between 0 and 10 or null,
  "amenities": ["array of strings"],
  "nearby_schools": ["array of strings"],
  "nearby_metro": ["array of strings"],
  "nearby_hospitals": ["array of strings"],
  "nearby_office_hubs": ["array of strings"],
  "latitude": number or null,
  "longitude": number or null,
  "google_maps_url": "string or null",
  "official_project_url": "official developer project page URL or null",
  "official_developer_url": "official developer home page URL or null",
  "official_gallery_url": "official project gallery URL or null",
  "image_reference_url": "official/source image URL if visible in source text, otherwise null",
  "image_url": "direct official/source image URL only if clearly available, otherwise null",
  "image_status": "needs_review | official_reference_found | placeholder | null",
  "image_alt_text": "short image alt text or null",
  "image_credit": "source/credit text or null",
  "image_license_notes": "short rights/review note or null",
  "rera_number": "string or null",
  "rera_status": "string or null",
  "meta_title": "SEO title under 65 chars",
  "meta_description": "SEO description under 155 chars",
  "faq": [
    {"question": "string", "answer": "string"}
  ],
  "source_confidence_score": integer 0 to 100,
  "data_quality": "short admin note",
  "fields_to_verify": ["array of fields admin should manually verify"]
}

Rules:
- Prefer Gurgaon/Gurugram context.
- Coordinates: for known Gurgaon societies, provide latitude and longitude when reasonably confident. Use 4-6 decimal precision. Do not invent dummy coordinates. If exact coordinates are uncertain, provide a Google Maps search URL and add coordinates to fields_to_verify.
- Scores: use differentiated one-decimal category scores. Do not return the same default score for every category unless strongly justified. Consider builder reputation, sector/locality, connectivity, lifestyle amenities, maintenance, security, and resale/rental demand.
- Project status and possession: search official developer/RERA/listing source text for delivery status. Normalize completed/live projects as Ready to Move or Delivered. For under-construction projects, return possession_date as the clearest source-supported month/quarter/year. If only uncertain marketing text exists, use Needs Review and add possession_date to fields_to_verify.
- Images: do not invent copyrighted image URLs. If an official/source image URL is visible in the supplied source text, return it as image_reference_url or image_url and mark image_status as needs_review or official_reference_found. Otherwise return null so the importer can create an admin review reference.
- Image candidate mode: {$imageInstruction}
- Search every major category before returning null. Populate project area, configurations, towers, units, market ranges, coordinates, nearby schools, hospitals, commute links, office hubs, official URLs and SEO whenever grounded evidence exists.
- Do not return a generic basic profile when search grounding is available. Use null only after the searched sources do not support the field.
- Market ranges (rent_range, buy_range, average_rent, average_sale_price, price_per_sqft, rental_yield): run SEPARATE searches for this exact project on 99acres, MagicBricks, Housing.com and Square Yards (e.g. "<project> <sector> 99acres price", "<project> magicbricks resale", "<project> housing.com rent"). Read the units CURRENTLY listed for sale/rent — never the builder's launch price, never a sector-wide average, never a single stale article. Prefer listings from the last 12 months. Build buy_range from the lowest to highest current resale listing and rent_range from the lowest to highest current asking rent, widening to cover disagreement between portals. These figures are checked against those portals, so accuracy is critical. Add any market field to fields_to_verify when data is thin or older than ~12 months.
- Keep all output review-first, not publicly guaranteed.
- If unsure, use null and add the field to fields_to_verify.
PROMPT;
    }

    private function parseJson(string $text): array
    {
        $text = trim($text);
        $text = preg_replace('/^```json\s*/i', '', $text) ?: $text;
        $text = preg_replace('/^```\s*/', '', $text) ?: $text;
        $text = preg_replace('/\s*```$/', '', $text) ?: $text;
        $text = trim($text);

        $data = json_decode($text, true);

        if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
            return $data;
        }

        if (preg_match('/\{.*\}/s', $text, $match)) {
            $data = json_decode($match[0], true);

            if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
                return $data;
            }
        }

        return [
            '_ai_error' => 'Could not parse Gemini JSON',
        ];
    }
}
