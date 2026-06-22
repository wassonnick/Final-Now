<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\Society;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class AIController extends Controller
{
    public function advisor(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'message' => 'required|string|min:2|max:1000',
            'intent' => 'nullable|string|in:rent,buy,resale,general',
        ]);

        $message = trim($validated['message']);
        $intent = $validated['intent'] ?? $this->detectIntent($message);
        $signals = $this->parseSignals($message, $intent);

        $listingTypes = $this->listingTypesForIntent($intent);

        $properties = Property::query()
            ->where('status', 'Live')
            ->whereHas('society', fn ($query) => $query
                ->where('is_published', true)
                ->whereIn('status', ['Verified', 'Premium']))
            ->when($listingTypes, fn ($query) => $query->whereIn('listing_type', $listingTypes))
            ->get()
            ->groupBy('society_id');

        $societies = Society::query()
            ->where('is_published', true)
            ->whereIn('status', ['Verified', 'Premium'])
            ->withCount(['properties as available_homes' => function ($query) use ($listingTypes) {
                $query->where('status', 'Live');
                if ($listingTypes) {
                    $query->whereIn('listing_type', $listingTypes);
                }
            }])
            ->orderByDesc('featured')
            ->orderByDesc('search_boost')
            ->orderByDesc('score')
            ->limit(120)
            ->get();

        $scoredMatches = $societies
            ->map(fn (Society $society) => $this->scoreSociety($society, $properties->get($society->id, collect()), $signals, $intent))
            ->filter(function (array $match) use ($signals) {
                if (!$signals['has_specific_signals']) {
                    return $match['raw_score'] >= 25;
                }

                return $match['is_relevant'] && $match['raw_score'] >= 25;
            })
            ->sortByDesc('raw_score')
            ->values();

        $matches = $scoredMatches
            ->take(5)
            ->map(fn (array $match) => $this->formatMatch($match))
            ->values();

        if ($matches->isEmpty() && !$signals['has_specific_signals']) {
            $matches = $societies
                ->take(3)
                ->map(fn (Society $society) => $this->formatMatch($this->scoreSociety($society, $properties->get($society->id, collect()), $signals, $intent, true)))
                ->values();
        }

        return response()->json([
            'status' => 'ok',
            'reply' => $this->replyFor($matches, $signals, $intent),
            'intent' => $intent,
            'signals' => [
                'bhk' => $signals['bhk'],
                'budget' => $signals['budget'],
                'locations' => $signals['locations'],
                'priorities' => $signals['priorities'],
                'keywords' => $signals['keywords'],
            ],
            'matches' => $matches,
        ]);
    }

    public function recommendations(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'budget' => 'nullable|integer|min:10000',
            'officeLocation' => 'nullable|string|max:255',
            'bhk' => 'nullable|integer|min:1|max:5',
            'familySize' => 'nullable|integer|min:1',
            'hasPets' => 'nullable|boolean',
            'priorities' => 'nullable|array|max:5',
        ]);

        $parts = [];
        if (!empty($validated['bhk'])) {
            $parts[] = $validated['bhk'].'BHK';
        }
        if (!empty($validated['officeLocation'])) {
            $parts[] = 'near '.$validated['officeLocation'];
        }
        if (!empty($validated['budget'])) {
            $parts[] = 'under Rs '.$validated['budget'];
        }
        if (!empty($validated['hasPets'])) {
            $parts[] = 'pet friendly';
        }
        foreach (($validated['priorities'] ?? []) as $priority) {
            $parts[] = (string) $priority;
        }

        $proxyRequest = Request::create('/api/ai/advisor', 'POST', [
            'message' => trim(implode(' ', $parts)) ?: 'Recommend societies in Gurgaon',
            'intent' => 'rent',
        ]);

        return $this->advisor($proxyRequest);
    }

    public function rentEstimate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'societyId' => 'required|exists:societies,id',
            'bhk' => 'required|integer|min:1|max:5',
            'area' => 'required|integer|min:300',
        ]);

        $society = Society::query()
            ->whereKey($validated['societyId'])
            ->where('is_published', true)
            ->whereIn('status', ['Verified', 'Premium'])
            ->firstOrFail();
        $bhk = (int) $validated['bhk'];
        $area = (int) $validated['area'];
        $baseRent = $this->priceFromText($society->average_rent ?: $society->rent_range) ?: (45000 + ($bhk * 18000));
        $score = (float) ($society->score ?: 8.0);
        $scoreMultiplier = 0.85 + (($score / 10) * 0.3);
        $standardArea = max($bhk * 500, 500);
        $areaMultiplier = max(0.75, min(1.4, $area / $standardArea));
        $estimatedRent = (int) round($baseRent * $scoreMultiplier * $areaMultiplier);

        return response()->json([
            'status' => 'ok',
            'estimated_rent' => $estimatedRent,
            'range_min' => (int) round($estimatedRent * 0.9),
            'range_max' => (int) round($estimatedRent * 1.1),
            'factors' => [
                'base_rent' => $baseRent,
                'society_score_multiplier' => round($scoreMultiplier, 2),
                'area_multiplier' => round($areaMultiplier, 2),
            ],
        ]);
    }

    private function detectIntent(string $message): string
    {
        $text = Str::lower($message);
        if (Str::contains($text, ['buy', 'purchase', 'resale', 'sale', 'crore', ' cr'])) {
            return Str::contains($text, 'resale') ? 'resale' : 'buy';
        }

        return 'rent';
    }

    private function parseSignals(string $message, string $intent): array
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
            'has_specific_signals' => $bhk || $budget || !empty($locations) || !empty($priorities) || !empty($keywords),
        ];
    }


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

    private function extractLocations(string $text): array
    {
        $locations = [];
        $knownLocations = [
            'cyber city', 'cyber hub', 'udyog vihar', 'golf course road', 'golf course extension',
            'golf course extension road', 'sohna road', 'mg road', 'nh 48', 'dwarka expressway',
            'dlf phase 1', 'dlf phase 2', 'dlf phase 3', 'dlf phase 4', 'dlf phase 5', 'dlf phase v',
            'sector 42', 'sector 43', 'sector 45', 'sector 46', 'sector 47', 'sector 48', 'sector 49',
            'sector 50', 'sector 54', 'sector 56', 'sector 57', 'sector 58', 'sector 59', 'sector 60',
            'sector 61', 'sector 62', 'sector 63', 'sector 65', 'sector 66', 'sector 67', 'sector 70',
            'sector 71', 'sector 72', 'sector 74', 'sector 79', 'sector 81', 'sector 82', 'sector 83',
            'sector 84', 'sector 85', 'sector 86', 'sector 90', 'sector 92', 'sector 102', 'sector 103',
            'sector 104', 'sector 106', 'sector 108', 'sector 109', 'sector 112', 'sector 113',
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
        if (!preg_match('/(?:under|below|upto|up to|within|budget|rs|₹)?\s*([0-9]+(?:\.[0-9]+)?)\s*(lakh|lac|l|k|thousand|cr|crore)?/i', $text, $match)) {
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

    private function listingTypesForIntent(string $intent): array
    {
        return match ($intent) {
            'rent' => ['Rent'],
            'buy', 'resale' => ['Sale', 'Buy / Resale', 'Sell Listing', 'Builder Floor'],
            default => [],
        };
    }

    private function scoreSociety(Society $society, Collection $properties, array $signals, string $intent, bool $fallback = false): array
    {
        $score = ((float) ($society->score ?: 8.0)) * 8;
        $reasons = [];
        $tags = [];
        $relevanceHits = 0;
        $haystack = Str::lower(implode(' ', array_filter([
            $society->name,
            $society->builder,
            $society->sector,
            $society->locality,
            $society->address,
            $society->description,
            $society->nearby_metro,
            $society->nearby_office_hubs,
            $society->nearby_schools,
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
            'is_relevant' => $relevanceHits > 0 || !$signals['has_specific_signals'] || $fallback,
            'relevance_hits' => $relevanceHits,
            'reasons' => array_values(array_unique(array_slice($reasons, 0, 3))),
            'tags' => array_values(array_unique(array_slice($tags, 0, 4))),
        ];
    }

    private function formatMatch(array $match): array
    {
        /** @var Society $society */
        $society = $match['society'];
        $score = round(((float) $match['raw_score']) / 10, 1);

        return [
            'id' => $society->id,
            'society_name' => $society->name,
            'slug' => $society->slug,
            'sector' => $society->sector,
            'locality' => $society->locality,
            'score' => $score,
            'rent_range' => $society->rent_range ?: $society->average_rent,
            'buy_range' => $society->buy_range ?: $society->average_sale_price,
            'available_homes' => (int) ($society->available_homes ?? 0),
            'reason' => $match['reasons'][0] ?? 'Verified society that fits the broad requirement.',
            'reasons' => $match['reasons'],
            'tags' => $match['tags'],
        ];
    }

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

    private function priceFromText(?string $value): ?int
    {
        if (!$value) {
            return null;
        }

        $text = Str::lower(str_replace([',', '₹', 'rs.', 'rs'], '', $value));
        if (!preg_match('/([0-9]+(?:\.[0-9]+)?)\s*(cr|crore|lakh|lac|l|k)?/i', $text, $match)) {
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
