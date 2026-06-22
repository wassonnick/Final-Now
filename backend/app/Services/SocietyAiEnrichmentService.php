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
        if ($this->provider() !== 'gemini') {
            return false;
        }

        return trim((string) config('services.gemini.api_key', '')) !== '';
    }

    public function status(): array
    {
        return [
            'provider' => $this->provider(),
            'available' => $this->isAvailable(),
            'model' => (string) config('services.gemini.model', 'gemini-2.0-flash'),
        ];
    }

    public function enrichSociety(string $name, string $context = '', string $source = '', bool $findImageCandidate = false, bool $useSearchGrounding = false): array
    {
        if (! $this->isAvailable()) {
            return [];
        }

        if ($this->provider() !== 'gemini') {
            return [];
        }

        return $this->enrichWithGemini($name, $context, $source, $findImageCandidate, $useSearchGrounding);
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

            foreach ([1, 2, 3] as $attempt) {
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
                        'generationConfig' => [
                            'temperature' => 0.2,
                            'responseMimeType' => 'application/json',
                        ],
                    ], fn ($value) => $value !== null));

                if ($response->successful()) {
                    break;
                }

                if ($response->status() !== 429 || $attempt === 3) {
                    break;
                }

                sleep($attempt * 2);
            }

            if (! $response || ! $response->successful()) {
                $status = $response ? $response->status() : 0;

                return [
                    '_ai_error' => 'Gemini HTTP '.$status,
                    '_ai_error_status' => $status,
                    '_ai_quota_limited' => $status === 429,
                ];
            }

            $text = (string) data_get($response->json(), 'candidates.0.content.parts.0.text', '');

            if ($text === '') {
                return [
                    '_ai_error' => 'Gemini returned empty text',
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
  "configuration": "string or null",
  "project_area": "string or null",
  "unit_size_range": "string or null",
  "year_built": "string or null",
  "total_towers": "string or null",
  "total_units": "string or null",
  "maintenance_charges": "string or null",
  "rent_range": "string or null",
  "buy_range": "string or null",
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
- Images: do not invent copyrighted image URLs. If an official/source image URL is visible in the supplied source text, return it as image_reference_url or image_url and mark image_status as needs_review or official_reference_found. Otherwise return null so the importer can create an admin review reference.
- Image candidate mode: {$imageInstruction}
- Search every major category before returning null. Populate project area, configurations, towers, units, market ranges, coordinates, nearby schools, hospitals, commute links, office hubs, official URLs and SEO whenever grounded evidence exists.
- Do not return a generic basic profile when search grounding is available. Use null only after the searched sources do not support the field.
- Prices/rent ranges can be broad market ranges but mark fields_to_verify.
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
