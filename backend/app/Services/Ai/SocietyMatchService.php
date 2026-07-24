<?php

namespace App\Services\Ai;

use App\Models\Property;
use App\Models\Society;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * The deterministic society-matching engine, extracted from AIController so both the
 * rules-based /ai/advisor endpoint and the Claude assistant's `search_societies` tool share
 * one honest source of truth. It only ever ranks published Verified/Premium societies — it
 * cannot invent inventory.
 */
class SocietyMatchService
{
    /**
     * Natural-language search: parse a free-text message into signals, then rank societies.
     *
     * @return array{intent:string,signals:array<string,mixed>,matches:array<int,array<string,mixed>>,reply:string}
     */
    public function search(string $message, ?string $intent = null): array
    {
        $intent = $intent ?: $this->detectIntent($message);
        $signals = $this->parseSignals($message, $intent);

        return $this->runSearch($signals, $intent);
    }

    /**
     * Structured search for the LLM tool: the model supplies explicit criteria instead of a
     * sentence, so matching is precise. `free_text` still feeds keyword/location matching.
     *
     * @param  array<string,mixed>  $criteria
     * @return array{intent:string,signals:array<string,mixed>,matches:array<int,array<string,mixed>>,reply:string}
     */
    public function searchStructured(array $criteria): array
    {
        $intent = in_array(($criteria['intent'] ?? null), ['rent', 'buy', 'resale', 'general'], true)
            ? $criteria['intent']
            : 'rent';

        $freeText = trim((string) ($criteria['free_text'] ?? ''));
        $base = $freeText !== '' ? $this->parseSignals($freeText, $intent) : $this->emptySignals($intent);

        $locations = array_values(array_unique(array_merge(
            $base['locations'],
            array_map(fn ($l) => Str::lower(trim((string) $l)), (array) ($criteria['locations'] ?? [])),
        )));
        $priorities = array_values(array_unique(array_merge(
            $base['priorities'],
            array_filter(array_map(fn ($p) => Str::lower(trim((string) $p)), (array) ($criteria['priorities'] ?? []))),
        )));
        $keywords = array_values(array_unique(array_merge(
            $base['keywords'],
            array_filter(array_map(fn ($k) => Str::lower(trim((string) $k)), (array) ($criteria['keywords'] ?? []))),
        )));

        $bhk = isset($criteria['bhk']) && (int) $criteria['bhk'] > 0 ? (int) $criteria['bhk'] : $base['bhk'];
        $budget = isset($criteria['budget']) && (int) $criteria['budget'] > 0 ? (int) $criteria['budget'] : $base['budget'];

        $signals = [
            'text' => $freeText !== '' ? Str::lower($freeText) : '',
            'intent' => $intent,
            'bhk' => $bhk,
            'budget' => $budget,
            'locations' => $locations,
            'priorities' => $priorities,
            'keywords' => array_slice($keywords, 0, 8),
            'has_specific_signals' => (bool) ($bhk || $budget || $locations || $priorities || $keywords),
        ];

        return $this->runSearch($signals, $intent);
    }

    /**
     * @param  array<string,mixed>  $signals
     * @return array{intent:string,signals:array<string,mixed>,matches:array<int,array<string,mixed>>,reply:string}
     */
    /** Query tokens too generic to identify a specific society by name. */
    private const GENERIC_NAME_TOKENS = [
        'gurgaon', 'gurugram', 'sector', 'society', 'societies', 'flat', 'flats', 'home', 'homes',
        'apartment', 'apartments', 'about', 'living', 'live', 'tell', 'the', 'and', 'with', 'near',
        'property', 'properties', 'rent', 'buy', 'resale', 'builder', 'floor', 'floors', 'price',
        'details', 'detail', 'info', 'information', 'compare', 'versus', 'area', 'project', 'projects',
    ];

    /**
     * Society ids whose NAME the user typed directly (e.g. "M3M Escala", "DLF The Crest"). These
     * bypass the score-ranked candidate slice and the relevance threshold so a specifically-named,
     * published society is never wrongly reported as "not in our database".
     *
     * @param  array<string,mixed>  $signals
     * @return array<int,int>
     */
    private function namedSocietyIds(array $signals): array
    {
        $tokens = collect(array_merge(
            (array) ($signals['keywords'] ?? []),
            preg_split('/\s+/', (string) ($signals['text'] ?? '')) ?: [],
        ))
            ->map(fn ($t) => Str::lower(trim((string) $t)))
            ->filter(fn ($t) => strlen($t) >= 3 && ! in_array($t, self::GENERIC_NAME_TOKENS, true))
            ->unique()
            ->values();

        if ($tokens->isEmpty()) {
            return [];
        }

        $candidates = Society::query()
            ->where('is_published', true)
            ->whereIn('status', ['Verified', 'Premium'])
            ->where(function ($query) use ($tokens) {
                foreach ($tokens as $token) {
                    $query->orWhereRaw('LOWER(name) LIKE ?', ['%'.$token.'%']);
                }
            })
            ->limit(40)
            ->get(['id', 'name']);

        // Require the name to contain at least min(2, tokens) of the query tokens, so one common
        // word can't drag in unrelated societies, but a two-word name the user typed matches.
        $required = min(2, $tokens->count());

        $exact = $candidates
            ->filter(function (Society $society) use ($tokens, $required) {
                $name = Str::lower((string) $society->name);

                return $tokens->filter(fn ($t) => str_contains($name, $t))->count() >= $required;
            })
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();

        // Typo tolerance: "Antaliyas" -> "M3M Antalya Hills". Merge trigram-similar names so a
        // misspelled society name still resolves instead of dead-ending with "not in our database".
        // The generic-filtered token phrase is a cleaner probe than the raw message.
        return array_values(array_unique(array_merge($exact, $this->fuzzySocietyIds($tokens->implode(' ')))));
    }

    /**
     * PostgreSQL trigram fuzzy match on society names for misspelled queries. Returns [] on
     * non-Postgres (SQLite tests) or if pg_trgm isn't available, so exact matching still stands.
     *
     * @return array<int,int>
     */
    private function fuzzySocietyIds(string $query): array
    {
        $query = Str::lower(trim($query));
        if (strlen($query) < 4 || DB::connection()->getDriverName() !== 'pgsql') {
            return [];
        }

        try {
            return Society::query()
                ->where('is_published', true)
                ->whereIn('status', ['Verified', 'Premium'])
                // word_similarity finds names that closely match a WINDOW of the message, so extra
                // words ("tell me about …", "compare … with …") don't drown out the name.
                ->whereRaw('word_similarity(lower(name), ?) >= 0.4', [$query])
                ->orderByRaw('word_similarity(lower(name), ?) desc', [$query])
                ->limit(3)
                ->pluck('id')
                ->map(fn ($id) => (int) $id)
                ->all();
        } catch (\Throwable $e) {
            return [];
        }
    }

    private function runSearch(array $signals, string $intent): array
    {
        $listingTypes = $this->listingTypesForIntent($intent);

        $properties = Property::query()
            ->publiclyAvailable()
            ->when($listingTypes, fn ($query) => $query->whereIn('listing_type', $listingTypes))
            ->get()
            ->groupBy('society_id');

        $withCount = fn ($query) => $query->withCount(['properties as available_homes' => function ($q) use ($listingTypes) {
            $q->publiclyAvailable();
            if ($listingTypes) {
                $q->whereIn('listing_type', $listingTypes);
            }
        }]);

        $namedIds = $this->namedSocietyIds($signals);

        $societies = $withCount(Society::query()
            ->where('is_published', true)
            ->whereIn('status', ['Verified', 'Premium']))
            ->orderByDesc('featured')
            ->orderByDesc('search_boost')
            ->orderByDesc('score')
            ->limit(120)
            ->get();

        // Always include societies the user named directly, even if they rank below the top slice.
        // Without this, "tell me about M3M Escala" wrongly returns "not in our database" whenever
        // that society sits outside the top 120 by score — the exact failure users hit.
        if ($namedIds) {
            $missing = array_values(array_diff($namedIds, $societies->pluck('id')->all()));
            if ($missing) {
                $societies = $societies->concat($withCount(Society::query()->whereIn('id', $missing))->get())->values();
            }
        }

        $scored = $societies
            ->map(fn (Society $society) => $this->scoreSociety($society, $properties->get($society->id, collect()), $signals, $intent))
            ->filter(function (array $match) use ($signals, $namedIds) {
                // A directly-named society is always kept — the user asked for it by name.
                if (in_array((int) $match['society']->id, $namedIds, true)) {
                    return true;
                }
                if (! $signals['has_specific_signals']) {
                    return $match['raw_score'] >= 25;
                }

                return $match['is_relevant'] && $match['raw_score'] >= 25;
            })
            ->sortByDesc(fn (array $match) => (in_array((int) $match['society']->id, $namedIds, true) ? 1000 : 0) + $match['raw_score'])
            ->values();

        $matches = $scored->take(6)->map(fn (array $m) => $this->formatMatch($m))->values();

        if ($matches->isEmpty() && ! $signals['has_specific_signals']) {
            $matches = $societies->take(3)
                ->map(fn (Society $s) => $this->formatMatch($this->scoreSociety($s, $properties->get($s->id, collect()), $signals, $intent, true)))
                ->values();
        }

        return [
            'intent' => $intent,
            'signals' => [
                'bhk' => $signals['bhk'],
                'budget' => $signals['budget'],
                'locations' => $signals['locations'],
                'priorities' => $signals['priorities'],
                'keywords' => $signals['keywords'],
            ],
            'matches' => $matches->all(),
            'reply' => $this->replyFor($matches, $signals, $intent),
        ];
    }

    public function detectIntent(string $message): string
    {
        $text = Str::lower($message);
        if (Str::contains($text, ['buy', 'purchase', 'resale', 'sale', 'crore', ' cr'])) {
            return Str::contains($text, 'resale') ? 'resale' : 'buy';
        }

        return 'rent';
    }

    /** @return array<string,mixed> */
    private function emptySignals(string $intent): array
    {
        return ['text' => '', 'intent' => $intent, 'bhk' => null, 'budget' => null, 'locations' => [], 'priorities' => [], 'keywords' => [], 'has_specific_signals' => false];
    }

    /** @return array<string,mixed> */
    public function parseSignals(string $message, string $intent): array
    {
        $text = Str::lower($message);
        $locations = $this->extractLocations($text);
        $priorities = [];

        $priorityMap = [
            'family' => ['family', 'kids', 'children', 'school', 'schools'],
            'pet_friendly' => ['pet', 'pets', 'dog', 'cat'],
            'metro' => ['metro', 'rapid metro'],
            'office_access' => ['office', 'cyber city', 'cyber hub', 'udyog vihar', 'golf course'],
            'luxury' => ['luxury', 'premium', 'high end', 'gated'],
            'value' => ['budget', 'value', 'affordable', 'under', 'below'],
        ];

        foreach ($priorityMap as $priority => $keywords) {
            if (Str::contains($text, $keywords)) {
                $priorities[] = $priority;
            }
        }

        preg_match('/\b([1-5])\s*(bhk|bed|bedroom)\b/i', $message, $bhkMatch);

        $bhk = isset($bhkMatch[1]) ? (int) $bhkMatch[1] : null;
        $budget = $this->extractBudget($text);
        $keywords = $this->extractSearchKeywords($text);

        return [
            'text' => $text,
            'intent' => $intent,
            'bhk' => $bhk,
            'budget' => $budget,
            'locations' => $locations,
            'priorities' => array_values(array_unique($priorities)),
            'keywords' => $keywords,
            'has_specific_signals' => $bhk || $budget || ! empty($locations) || ! empty($priorities) || ! empty($keywords),
        ];
    }

    /** @return array<int,string> */
    private function extractSearchKeywords(string $text): array
    {
        $clean = preg_replace('/[^a-z0-9\s]/', ' ', Str::lower($text));
        $tokens = preg_split('/\s+/', trim((string) $clean)) ?: [];
        $stopWords = [
            'best', 'top', 'good', 'better', 'society', 'societies', 'flat', 'flats', 'home', 'homes',
            'near', 'around', 'under', 'below', 'upto', 'within', 'budget', 'rent', 'rental', 'buy',
            'resale', 'sale', 'for', 'in', 'at', 'on', 'and', 'or', 'the', 'a', 'an', 'with', 'without',
            'bhk', 'bed', 'bedroom', 'bedrooms', 'rs', 'l', 'lac', 'lakh', 'k', 'cr', 'crore', 'gurgaon', 'gurugram',
        ];

        $keywords = [];
        foreach ($tokens as $token) {
            if (strlen($token) < 3 || in_array($token, $stopWords, true) || is_numeric($token)) {
                continue;
            }
            $keywords[] = $token;
        }

        return array_values(array_unique(array_slice($keywords, 0, 6)));
    }

    /** @return array<int,string> */
    private function extractLocations(string $text): array
    {
        $locations = [];
        $knownLocations = [
            'cyber city', 'cyber hub', 'udyog vihar', 'golf course road', 'golf course extension',
            'golf course extension road', 'sohna road', 'mg road', 'nh 48', 'dwarka expressway',
            'dlf phase 1', 'dlf phase 2', 'dlf phase 3', 'dlf phase 4', 'dlf phase 5', 'dlf phase v',
        ];

        foreach ($knownLocations as $location) {
            if (Str::contains($text, $location)) {
                $locations[] = $location;
            }
        }

        if (preg_match_all('/\bsector\s*[- ]?([0-9]{1,3})\b/i', $text, $matches)) {
            foreach ($matches[1] as $sector) {
                $locations[] = 'sector '.(int) $sector;
            }
        }

        return array_values(array_unique($locations));
    }

    private function extractBudget(string $text): ?int
    {
        if (! preg_match('/(?:under|below|upto|up to|within|budget|rs|₹)?\s*([0-9]+(?:\.[0-9]+)?)\s*(lakh|lac|l|k|thousand|cr|crore)?/i', $text, $match)) {
            return null;
        }

        $number = (float) $match[1];
        $unit = Str::lower($match[2] ?? '');

        return match ($unit) {
            'cr', 'crore' => (int) round($number * 10000000),
            'lakh', 'lac', 'l' => (int) round($number * 100000),
            'k', 'thousand' => (int) round($number * 1000),
            default => $number < 1000 ? (int) round($number * 100000) : (int) round($number),
        };
    }

    /** @return array<int,string> */
    public function listingTypesForIntent(string $intent): array
    {
        return match ($intent) {
            'rent' => ['Rent'],
            'buy', 'resale' => ['Sale', 'Buy / Resale', 'Sell Listing', 'Builder Floor'],
            default => [],
        };
    }

    /**
     * @param  array<string,mixed>  $signals
     * @return array<string,mixed>
     */
    private function scoreSociety(Society $society, Collection $properties, array $signals, string $intent, bool $fallback = false): array
    {
        $score = ((float) ($society->score ?: 8.0)) * 8;
        $reasons = [];
        $tags = [];
        $relevanceHits = 0;
        $haystack = Str::lower(implode(' ', array_filter([
            $society->name, $society->builder, $society->sector, $society->locality, $society->address, $society->description,
            $society->nearby_metro ? implode(' ', (array) $society->nearby_metro) : '',
            $society->nearby_office_hubs ? implode(' ', (array) $society->nearby_office_hubs) : '',
            $society->nearby_schools ? implode(' ', (array) $society->nearby_schools) : '',
            $society->amenities ? implode(' ', (array) $society->amenities) : '',
        ])));

        foreach ($signals['keywords'] as $keyword) {
            if (Str::contains($haystack, $keyword)) {
                $score += 30;
                $relevanceHits += 3;
                $reasons[] = 'Directly matches your search term: '.Str::title($keyword).'.';
                $tags[] = Str::title($keyword);
            } else {
                $score -= 12;
            }
        }

        foreach ($signals['locations'] as $location) {
            if (Str::contains($haystack, $location)) {
                $score += 22;
                $relevanceHits += 2;
                $reasons[] = 'Matches your preferred location: '.Str::title($location).'.';
                $tags[] = Str::title($location);
                break;
            }
        }

        $matchingProperties = $properties;
        if ($signals['bhk']) {
            $matchingProperties = $matchingProperties->filter(fn (Property $property) => (int) $property->bedrooms === (int) $signals['bhk']);
            if ($matchingProperties->isNotEmpty() || Str::contains($haystack, (string) $signals['bhk'].'bhk')) {
                $score += 14;
                $relevanceHits += 1;
                $reasons[] = 'Has inventory/signals for '.$signals['bhk'].'BHK homes.';
                $tags[] = $signals['bhk'].'BHK';
            }
        }

        if ($signals['budget']) {
            $budgetMatches = $matchingProperties->filter(function (Property $property) use ($signals) {
                $price = $this->priceFromText($property->price);

                return $price && $price <= ((int) $signals['budget'] * 1.15);
            });

            $rangeText = $intent === 'rent' ? ($society->average_rent ?: $society->rent_range) : ($society->average_sale_price ?: $society->buy_range);
            $rangePrice = $this->priceFromText($rangeText);

            if ($budgetMatches->isNotEmpty() || ($rangePrice && $rangePrice <= ((int) $signals['budget'] * 1.2))) {
                $score += 18;
                $relevanceHits += 1;
                $reasons[] = 'Looks aligned with your budget range.';
                $tags[] = 'Budget match';
            } else {
                $score -= 8;
            }
        }

        foreach ($signals['priorities'] as $priority) {
            if ($priority === 'family' && (Str::contains($haystack, ['school', 'family', 'kids']) || (float) $society->lifestyle_score >= 8)) {
                $score += 8;
                $relevanceHits += 1;
                $reasons[] = 'Good family-living signals from schools/lifestyle data.';
                $tags[] = 'Family Friendly';
            }
            if ($priority === 'pet_friendly' && Str::contains($haystack, ['pet', 'dog', 'park'])) {
                $score += 8;
                $relevanceHits += 1;
                $reasons[] = 'Pet-friendly signals found in society details.';
                $tags[] = 'Pet Friendly';
            }
            if ($priority === 'metro' && Str::contains($haystack, ['metro', 'rapid metro'])) {
                $score += 8;
                $relevanceHits += 1;
                $reasons[] = 'Metro connectivity is mentioned in society intelligence.';
                $tags[] = 'Near Metro';
            }
            if ($priority === 'office_access' && Str::contains($haystack, ['cyber city', 'cyber hub', 'udyog vihar', 'office', 'golf course'])) {
                $score += 8;
                $relevanceHits += 1;
                $reasons[] = 'Strong office-hub connectivity signals.';
                $tags[] = 'Office Access';
            }
            if ($priority === 'luxury' && ((float) $society->score >= 8.5 || $society->status === 'Premium')) {
                $score += 8;
                $relevanceHits += 1;
                $reasons[] = 'Premium society profile with high overall score.';
                $tags[] = 'Premium';
            }
        }

        if ((int) ($society->available_homes ?? 0) > 0) {
            $score += min(12, (int) $society->available_homes * 2);
            $reasons[] = 'Live inventory is available for enquiry.';
        }

        if ($society->featured || $society->search_boost) {
            $score += 5;
        }

        if ($fallback && empty($reasons)) {
            $reasons[] = 'Verified Gurgaon society with available marketplace data.';
        }

        if (empty($tags)) {
            $tags = array_values(array_filter([
                $society->status === 'Premium' ? 'Premium' : 'Verified',
                $society->sector ?: null,
                $society->locality ?: null,
            ]));
        }

        return [
            'society' => $society,
            'raw_score' => round(max(0, min(100, $score)), 1),
            'is_relevant' => $relevanceHits > 0 || ! $signals['has_specific_signals'] || $fallback,
            'relevance_hits' => $relevanceHits,
            'reasons' => array_values(array_unique(array_slice($reasons, 0, 3))),
            'tags' => array_values(array_unique(array_slice($tags, 0, 4))),
        ];
    }

    /**
     * @param  array<string,mixed>  $match
     * @return array<string,mixed>
     */
    private function formatMatch(array $match): array
    {
        /** @var Society $society */
        $society = $match['society'];

        return [
            'id' => $society->id,
            'society_name' => $society->name,
            'slug' => $society->slug,
            'sector' => $society->sector,
            'locality' => $society->locality,
            'score' => round(((float) $match['raw_score']) / 10, 1),
            'rent_range' => $society->rent_range ?: $society->average_rent,
            'buy_range' => $society->buy_range ?: $society->average_sale_price,
            'available_homes' => (int) ($society->available_homes ?? 0),
            'reason' => $match['reasons'][0] ?? 'Verified society that fits the broad requirement.',
            'reasons' => $match['reasons'],
            'tags' => $match['tags'],
            'url' => '/society/'.$society->slug,
        ];
    }

    /**
     * @param  Collection<int,array<string,mixed>>  $matches
     * @param  array<string,mixed>  $signals
     */
    private function replyFor(Collection $matches, array $signals, string $intent): string
    {
        if ($matches->isEmpty()) {
            return 'I could not find a strong live database match for this exact requirement yet. Please request a callback and our team will shortlist verified options manually.';
        }

        $pieces = [];
        if ($signals['bhk']) {
            $pieces[] = $signals['bhk'].'BHK';
        }
        if ($signals['locations']) {
            $pieces[] = 'near '.Str::title($signals['locations'][0]);
        }
        if ($signals['budget']) {
            $pieces[] = 'within your budget';
        }

        $requirement = $pieces ? ' for '.implode(' ', $pieces) : '';

        return 'I found the closest society matches'.$requirement.' from the live SocietyFlats database. Open a result to view society details, available homes and next-step options.';
    }

    public function priceFromText(?string $value): ?int
    {
        if (! $value) {
            return null;
        }

        $text = Str::lower(str_replace([',', '₹', 'rs.', 'rs'], '', $value));
        if (! preg_match('/([0-9]+(?:\.[0-9]+)?)\s*(cr|crore|lakh|lac|l|k)?/i', $text, $match)) {
            return null;
        }

        $number = (float) $match[1];
        $unit = Str::lower($match[2] ?? '');

        return match ($unit) {
            'cr', 'crore' => (int) round($number * 10000000),
            'lakh', 'lac', 'l' => (int) round($number * 100000),
            'k' => (int) round($number * 1000),
            default => (int) round($number),
        };
    }
}
