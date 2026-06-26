<?php

namespace App\Services\Society\Import;

use App\Services\SocietyAiEnrichmentService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Orchestrates the staged, provenance-aware import for ONE society.
 *
 *   0–1  PlaceResolverService     → authoritative identity, coords, address, photos
 *   2    NeighborhoodIntelService → POIs with real measured distances
 *   3–4  SocietyAiEnrichmentService (grounded) → builder/status/market/copy gaps
 *   5    SocietyScoringService    → deterministic 6 scores + breakdown
 *   6    SocietyImageHarvestService → multi-source image candidates (publish-gated)
 *   7    assemble draft attributes + field_sources provenance + real fields_to_verify
 *
 * Field priority: admin SEED > authoritative Google > grounded Gemini > safe default.
 * Coordinates/address are NEVER taken from the LLM. Returns attributes only; the
 * caller (SocietyImportService) owns slug uniqueness and the DB write.
 *
 * @phpstan-type Outcome array{status:string, message?:string, attributes?:array, image_candidates?:array, logs:array}
 */
class SocietyImportPipeline
{
    public function __construct(
        private PlaceResolverService $places,
        private NeighborhoodIntelService $neighborhood,
        private SocietyAiEnrichmentService $ai,
        private SocietyScoringService $scoring,
        private SocietyImageHarvestService $images,
    ) {}

    /**
     * @param  array{name:string, location?:?string, url?:?string, seed?:array, include_images?:bool, source?:string}  $input
     * @return Outcome
     */
    public function build(array $input): array
    {
        $name = trim((string) $input['name']);
        $seed = (array) ($input['seed'] ?? []);
        $source = (string) ($input['source'] ?? 'Import');
        $includeImages = (bool) ($input['include_images'] ?? true);
        $url = trim((string) ($input['url'] ?? ''));
        $location = trim((string) ($input['location'] ?? implode(' ', array_filter([
            $seed['sector'] ?? null, $seed['locality'] ?? null, $seed['city'] ?? null,
        ]))));
        $logs = [];

        // Stage 0–1: authoritative place facts.
        $place = ['matched' => false];
        if ($this->places->configured()) {
            $place = $this->places->resolve($name, $location ?: null, $seed['place_id'] ?? null);
            $logs[] = $place['matched']
                ? "Google Places matched: {$place['name']} ({$place['place_id']})."
                : 'No Google Places match ('.($place['reason'] ?? 'unknown').').';
        } else {
            $logs[] = 'Google Places not configured; coordinates/address require manual review.';
        }

        // Stage 2: neighbourhood facts with measured distances.
        $lat = $place['latitude'] ?? null;
        $lng = $place['longitude'] ?? null;
        $nearby = ['available' => false, 'nearby' => [], 'lines' => []];
        if ($lat !== null && $lng !== null) {
            $nearby = $this->neighborhood->gather((float) $lat, (float) $lng);
            $logs[] = $nearby['available']
                ? 'Neighbourhood intelligence gathered with measured distances.'
                : 'Neighbourhood lookup skipped ('.($nearby['reason'] ?? 'unknown').').';
        }

        // Optional source URL → context + image source.
        $urlText = '';
        if ($url !== '') {
            $urlText = $this->fetchUrlText($url);
            $logs[] = $urlText !== '' ? "Fetched source URL context: {$url}" : "Source URL did not return usable text: {$url}";
        }

        // Stage 3–4: grounded Gemini gap-fill (reuses the tested enrichment service).
        $aiData = [];
        if ($this->ai->isAvailable()) {
            $context = $this->geminiContext($place, $nearby, $seed, $urlText);
            $aiData = $this->ai->enrichSociety($name, $context, $source, $includeImages, true);

            if (! empty($aiData['_ai_error'])) {
                $message = ! empty($aiData['_ai_quota_limited'])
                    ? 'AI quota/rate limit hit. Draft not created to avoid weak fallback data. Try again later or reduce bulk size.'
                    : (! empty($aiData['_ai_temporarily_unavailable'])
                        ? 'Gemini is temporarily unavailable (HTTP 503). Draft not created to avoid weak fallback data. Retry shortly.'
                        : 'AI enrichment failed: '.$aiData['_ai_error'].'. Draft not created to avoid weak fallback data.');
                $logs[] = $message;

                return ['status' => 'ai_failed', 'message' => $message, 'logs' => $logs];
            }

            $logs[] = $aiData === [] ? 'Gemini returned no structured fields.' : 'Gemini gap-fill parsed into draft fields.';
        } else {
            $logs[] = 'Gemini not configured; draft built from authoritative + admin data only.';
        }

        // Stage 7 (assemble) + Stage 5 (score) + Stage 6 (images).
        $attr = $this->assemble($name, $source, $place, $nearby, $aiData, $seed);

        $scored = $this->scoring->score($this->scoringFacts($attr, $place, $nearby));
        foreach ($scored['scores'] as $field => $value) {
            $attr[$field] = $value;
        }
        $attr['score_breakdown'] = $scored['breakdown'];
        $logs[] = 'Deterministic scores computed (confidence '.$scored['confidence'].').';

        $candidates = [];
        if ($includeImages) {
            $candidates = $this->images->harvest([
                'name' => $name,
                'urls' => [$attr['official_project_url'] ?? null, $attr['official_developer_url'] ?? null, $place['website'] ?? null, $url ?: null],
                'photo_references' => $place['photo_references'] ?? [],
                'place_id' => $place['place_id'] ?? null,
            ]);
            $attr['image_candidates'] = $candidates;
            $this->applyCoverFromCandidates($attr, $candidates);
            $logs[] = count($candidates).' image candidate(s) harvested. Admin approval + rights confirmation required before any go live.';
        }

        $attr['field_sources'] = $this->provenance($attr, $place, $nearby, $aiData, $seed, $scored);
        $attr['fields_to_verify'] = $this->fieldsToVerify($attr, $place, $nearby, $aiData, $scored, $candidates);
        $attr['data_quality'] = $this->dataQuality($scored['confidence'], $place['matched'] ?? false);

        return ['status' => 'ok', 'attributes' => $attr, 'image_candidates' => $candidates, 'logs' => $logs];
    }

    // ---- Assembly ---------------------------------------------------------

    private function assemble(string $name, string $source, array $place, array $nearby, array $aiData, array $seed): array
    {
        $attr = $this->defaults($name, $source);

        // Layer 1: grounded Gemini soft fields (coordinates excluded by design).
        foreach ($this->aiStringFields() as $field) {
            $value = $this->cleanString($aiData[$field] ?? null);
            if ($value !== null) {
                $attr[$field] = $value;
            }
        }
        foreach (['amenities', 'nearby_schools', 'nearby_metro', 'nearby_hospitals', 'nearby_office_hubs'] as $field) {
            $value = $this->cleanStringArray($aiData[$field] ?? null);
            if ($value !== []) {
                $attr[$field] = $value;
            }
        }
        $faq = $this->cleanFaq($aiData['faq'] ?? null);
        if ($faq !== []) {
            $attr['faq'] = $faq;
        }

        // Layer 2: authoritative Google facts override hard fields.
        if (($place['matched'] ?? false)) {
            $attr = $this->applyPlace($attr, $place);
        }

        // Coordinates from a Maps URL when Places did not match.
        if (($attr['latitude'] ?? null) === null) {
            $coords = $this->coordsFromUrl((string) ($seed['google_maps_url'] ?? $attr['google_maps_url'] ?? ''));
            if ($coords !== null) {
                [$attr['latitude'], $attr['longitude']] = $coords;
            }
        }

        // Layer 3: measured neighbourhood lines override AI nearby_* when present.
        foreach (($nearby['lines'] ?? []) as $field => $lines) {
            if ($lines !== []) {
                $attr[$field] = $lines;
            }
        }

        // Layer 4: admin SEED identity wins over everything.
        foreach (['city', 'sector', 'locality', 'builder', 'google_maps_url'] as $field) {
            if (isset($seed[$field]) && trim((string) $seed[$field]) !== '') {
                $attr[$field] = trim((string) $seed[$field]);
            }
        }

        $attr['source_name'] = $source;
        $attr['imported_at'] = now();

        return $attr;
    }

    private function defaults(string $name, string $source): array
    {
        return [
            'name' => $name,
            'builder' => 'To be verified',
            'sector' => null,
            'locality' => null,
            'city' => 'Gurugram',
            'state' => 'Haryana',
            'address' => null,
            'description' => "{$name} is imported as a draft society profile for SocietyFlats admin review. Verify builder, location, pricing, amenities, coordinates and official sources before publishing.",
            'project_status' => 'Needs Review',
            'possession_date' => 'Needs Review',
            'rent_range' => 'To be verified',
            'buy_range' => 'To be verified',
            'amenities' => [],
            'latitude' => null,
            'longitude' => null,
            'meta_title' => Str::limit("{$name} Gurgaon | SocietyFlats", 65, ''),
            'meta_description' => Str::limit("Review {$name} in Gurgaon on SocietyFlats — verify rent, resale, amenities, location and homes before publishing.", 155, ''),
            'status' => 'Draft',
            'verification_status' => 'Needs Review',
            'is_published' => false,
            'published_at' => null,
            'featured' => false,
            'show_in_hero' => false,
            'search_boost' => false,
            'source_name' => $source,
            'source_confidence_score' => 35,
            'image_approved_by_admin' => false,
        ];
    }

    private function applyPlace(array $attr, array $place): array
    {
        if ($place['latitude'] !== null && $place['longitude'] !== null) {
            $attr['latitude'] = (string) $place['latitude'];
            $attr['longitude'] = (string) $place['longitude'];
        }
        foreach (['sector', 'locality', 'address'] as $field) {
            if (! empty($place[$field])) {
                $attr[$field] = $place[$field];
            }
        }
        if (! empty($place['city'])) {
            $attr['city'] = $place['city'];
        }
        if (! empty($place['state'])) {
            $attr['state'] = $place['state'];
        }
        if (! empty($place['google_maps_url'])) {
            $attr['google_maps_url'] = $place['google_maps_url'];
        }
        if (! empty($place['place_id'])) {
            $attr['place_id'] = $place['place_id'];
        }
        if (empty($attr['official_developer_url']) && ! empty($place['website'])) {
            $attr['official_developer_url'] = $place['website'];
        }

        return $attr;
    }

    private function applyCoverFromCandidates(array &$attr, array $candidates): void
    {
        // Pre-fill the review image fields from the first previewable official image,
        // but keep it unapproved + private (image_approved_by_admin stays false).
        foreach ($candidates as $candidate) {
            if (($candidate['source'] ?? '') === 'official_url' && ! empty($candidate['url'])) {
                $attr['image_url'] = $attr['image_url'] ?? $candidate['url'];
                $attr['image_reference_url'] = $attr['image_reference_url'] ?? $candidate['url'];
                $attr['image_status'] = $attr['image_status'] ?? 'needs_review';
                $attr['image_credit'] = $attr['image_credit'] ?? $candidate['credit'];
                $attr['image_license_notes'] = $attr['image_license_notes'] ?? $candidate['license_note'];
                break;
            }
        }
        $attr['image_approved_by_admin'] = false;
    }

    // ---- Scoring facts ----------------------------------------------------

    private function scoringFacts(array $attr, array $place, array $nearby): array
    {
        return [
            'name' => $attr['name'] ?? null,
            'builder' => $attr['builder'] ?? null,
            'locality' => $attr['locality'] ?? null,
            'sector' => $attr['sector'] ?? null,
            'address' => $attr['address'] ?? null,
            'amenities' => $attr['amenities'] ?? [],
            'latitude' => $attr['latitude'] ?? null,
            'longitude' => $attr['longitude'] ?? null,
            'nearby' => $nearby['nearby'] ?? [],
            'rating' => $place['rating'] ?? null,
            'rating_count' => $place['rating_count'] ?? null,
            'year_built' => $attr['year_built'] ?? null,
            'rental_yield' => $attr['rental_yield'] ?? null,
            'project_status' => $attr['project_status'] ?? null,
            'possession_date' => $attr['possession_date'] ?? null,
            'market_confirmed' => false, // Gemini market estimates are unconfirmed at import time.
        ];
    }

    // ---- Provenance + verification ----------------------------------------

    private function provenance(array $attr, array $place, array $nearby, array $aiData, array $seed, array $scored): array
    {
        $sources = [];
        $matched = $place['matched'] ?? false;

        $tag = function (string $field, string $source, int $confidence) use (&$sources) {
            $sources[$field] = ['source' => $source, 'confidence' => $confidence];
        };

        if ($matched) {
            foreach (['latitude', 'longitude', 'address', 'google_maps_url', 'place_id'] as $f) {
                if (! empty($attr[$f])) {
                    $tag($f, 'google_places', 95);
                }
            }
            foreach (['sector', 'locality', 'city', 'state'] as $f) {
                if (! empty($attr[$f])) {
                    $tag($f, 'google_places', 88);
                }
            }
        }

        foreach (($nearby['lines'] ?? []) as $field => $lines) {
            if ($lines !== []) {
                $tag($field, 'neighborhood_measured', 90);
            }
        }

        $marketFields = ['rent_range', 'buy_range', 'average_rent', 'average_sale_price', 'price_per_sqft', 'rental_yield'];
        foreach ($this->aiStringFields() as $field) {
            if (isset($sources[$field]) || empty($aiData[$field])) {
                continue;
            }
            $tag($field, 'gemini_grounded', in_array($field, $marketFields, true) ? 35 : 50);
        }

        foreach (['city', 'sector', 'locality', 'builder', 'google_maps_url'] as $field) {
            if (isset($seed[$field]) && trim((string) $seed[$field]) !== '') {
                $tag($field, 'admin_seed', 100);
            }
        }

        foreach (['score', 'security_score', 'maintenance_score', 'connectivity_score', 'lifestyle_score', 'investment_score'] as $field) {
            $tag($field, 'computed', (int) round(($scored['confidence'] ?? 0) * 100));
        }

        return $sources;
    }

    private function fieldsToVerify(array $attr, array $place, array $nearby, array $aiData, array $scored, array $candidates): array
    {
        $verify = [];

        if (empty($place['matched'])) {
            $verify[] = 'coordinates';
            $verify[] = 'address';
        }
        foreach (['rent_range', 'buy_range', 'rental_yield', 'average_rent', 'price_per_sqft'] as $field) {
            if (! empty($aiData[$field])) {
                $verify[] = 'market_ranges';
                break;
            }
        }
        if (! empty($aiData['rera_number']) || ! empty($aiData['rera_status'])) {
            $verify[] = 'rera_details';
        }
        if (empty($nearby['available'])) {
            $verify[] = 'distances';
        }
        if ($candidates !== []) {
            $verify[] = 'image_rights';
        }
        if (($scored['confidence'] ?? 0) < 0.6) {
            $verify[] = 'scores';
        }
        if (trim((string) ($attr['builder'] ?? '')) === '' || strtolower((string) $attr['builder']) === 'to be verified') {
            $verify[] = 'builder';
        }

        return array_values(array_unique($verify));
    }

    private function dataQuality(float $confidence, bool $matched): string
    {
        $percent = (int) round($confidence * 100);
        $anchor = $matched ? 'Google-anchored' : 'unanchored';

        return "{$anchor} draft, scoring confidence {$percent}% — admin verification required";
    }

    // ---- Gemini context ---------------------------------------------------

    private function geminiContext(array $place, array $nearby, array $seed, string $urlText): string
    {
        $lines = ['Use ONLY the confirmed facts below as ground truth; fill the remaining gaps with grounded research and cite sources. Do not contradict confirmed coordinates or address.'];

        if ($place['matched'] ?? false) {
            $lines[] = 'CONFIRMED (Google Places):';
            foreach (['name', 'formatted_address', 'sector', 'locality', 'city', 'state', 'latitude', 'longitude'] as $f) {
                if (! empty($place[$f])) {
                    $lines[] = "- {$f}: {$place[$f]}";
                }
            }
            if (! empty($place['rating'])) {
                $lines[] = "- google_rating: {$place['rating']} ({$place['rating_count']} reviews)";
            }
        }

        $seedFacts = array_filter([
            'city' => $seed['city'] ?? null, 'sector' => $seed['sector'] ?? null,
            'locality' => $seed['locality'] ?? null, 'builder' => $seed['builder'] ?? null,
        ]);
        if ($seedFacts !== []) {
            $lines[] = 'ADMIN-PROVIDED (authoritative): '.json_encode($seedFacts, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        }

        foreach (($nearby['lines'] ?? []) as $field => $items) {
            if ($items !== []) {
                $lines[] = strtoupper($field).': '.implode(' | ', array_slice($items, 0, 3));
            }
        }

        if ($urlText !== '') {
            $lines[] = "SOURCE PAGE TEXT:\n".Str::limit($urlText, 6000, '');
        }

        return implode("\n", $lines);
    }

    private function fetchUrlText(string $url): string
    {
        try {
            $response = Http::timeout(12)
                ->withHeaders(['User-Agent' => 'SocietyFlats Importer/2.0', 'Accept' => 'text/html,*/*'])
                ->get($url);
            if (! $response->successful()) {
                return '';
            }
            $html = (string) $response->body();
        } catch (\Throwable) {
            return '';
        }

        $html = preg_replace('/<script\b[^>]*>.*?<\/script>/is', ' ', $html) ?? $html;
        $html = preg_replace('/<style\b[^>]*>.*?<\/style>/is', ' ', $html) ?? $html;
        $text = preg_replace('/\s+/', ' ', html_entity_decode(strip_tags($html))) ?? '';

        return trim($text);
    }

    // ---- Cleaning helpers -------------------------------------------------

    /** @return array<int,string> */
    private function aiStringFields(): array
    {
        return [
            'builder', 'sector', 'locality', 'city', 'state', 'address', 'description',
            'project_status', 'possession_date', 'configuration', 'project_area', 'unit_size_range',
            'year_built', 'total_towers', 'total_units', 'maintenance_charges',
            'rent_range', 'buy_range', 'rental_yield', 'average_rent', 'average_sale_price', 'price_per_sqft',
            'rera_number', 'rera_status', 'meta_title', 'meta_description',
            'official_project_url', 'official_developer_url', 'official_gallery_url',
            'image_url', 'image_status', 'image_alt_text', 'image_credit', 'image_license_notes',
        ];
    }

    private function cleanString(mixed $value): ?string
    {
        if (is_array($value)) {
            $value = implode(', ', array_filter(array_map(fn ($v) => trim((string) $v), $value)));
        }
        $value = trim((string) ($value ?? ''));

        return ($value === '' || strtolower($value) === 'null') ? null : $value;
    }

    /** @return array<int,string> */
    private function cleanStringArray(mixed $value): array
    {
        if (is_string($value)) {
            $value = preg_split('/[\n]+/', $value) ?: [];
        }
        if (! is_array($value)) {
            return [];
        }
        $items = [];
        foreach ($value as $item) {
            $clean = trim((string) $item);
            if ($clean !== '' && strtolower($clean) !== 'null') {
                $items[] = $clean;
            }
        }

        return array_values(array_unique($items));
    }

    /** @return array<int,array{question:string,answer:string}> */
    private function cleanFaq(mixed $value): array
    {
        if (! is_array($value)) {
            return [];
        }
        $faq = [];
        foreach ($value as $item) {
            if (! is_array($item)) {
                continue;
            }
            $q = trim((string) ($item['question'] ?? ''));
            $a = trim((string) ($item['answer'] ?? ''));
            if ($q !== '' && $a !== '') {
                $faq[] = ['question' => $q, 'answer' => $a];
            }
        }

        return $faq;
    }

    /** @return array{0:string,1:string}|null */
    private function coordsFromUrl(string $url): ?array
    {
        if ($url === '') {
            return null;
        }
        if (preg_match('/@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/', $url, $m)
            || preg_match('/(?:query|q)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/', urldecode($url), $m)) {
            return [(string) round((float) $m[1], 7), (string) round((float) $m[2], 7)];
        }

        return null;
    }
}
