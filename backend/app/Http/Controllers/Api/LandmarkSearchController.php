<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Landmark;
use App\Models\Society;
use App\Services\Search\LandmarkQueryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * "Somewhere near Ambience Mall" — answered with societies, nearest first.
 *
 * People searching for a home rarely know which society they want; they know the office
 * they commute to, the mall they like, the metro line they need. Search understood society
 * names, sectors and localities, so every one of those searches came back empty.
 */
class LandmarkSearchController extends Controller
{
    /** Far enough to be a real option in NCR traffic, close enough to still mean "near". */
    private const DEFAULT_RADIUS_KM = 6.0;

    private const MAX_RADIUS_KM = 25.0;

    public function __invoke(Request $request, LandmarkQueryService $queries): JsonResponse
    {
        $query = trim((string) $request->query('q', ''));

        if ($query === '') {
            return response()->json(['status' => 'ok', 'landmark' => null, 'societies' => []]);
        }

        $parsed = $queries->parse($query);
        $landmark = $parsed['landmark'];

        // Nothing curated matched, so ask Google once and keep the answer — but only when
        // the sentence is actually about proximity. "park facing home in golf course" names
        // no landmark; sent to Places it came back as Delhi Golf Club, and the page then
        // announced results as "nearest to" a place nobody asked about. Every one of those
        // lookups was also billed.
        if (! $landmark && $parsed['phrase'] && $request->boolean('learn', true)) {
            $landmark = $queries->learn($this->landmarkPhrase($query), $request->query('city'));
        }

        if (! $landmark) {
            return response()->json([
                'status' => 'ok',
                'landmark' => null,
                'remainder' => $parsed['remainder'],
                'societies' => [],
            ]);
        }

        $landmark->increment('searches');

        $radius = min(max((float) ($parsed['radius_km'] ?? self::DEFAULT_RADIUS_KM), 0.5), self::MAX_RADIUS_KM);

        $societies = Society::query()
            ->where('is_published', true)
            ->whereIn('status', ['Verified', 'Premium'])
            ->inLiveCities()
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->get()
            ->map(function (Society $society) use ($landmark) {
                $society->setAttribute('distance_km', $landmark->distanceTo(
                    is_numeric($society->latitude) ? (float) $society->latitude : null,
                    is_numeric($society->longitude) ? (float) $society->longitude : null,
                ));

                return $society;
            })
            ->filter(fn (Society $society) => $society->getAttribute('distance_km') !== null)
            ->filter(fn (Society $society) => $society->getAttribute('distance_km') <= $radius)
            // Nearest first, because that is the question that was asked. Score decides
            // ties, so two equally close societies still lead with the better one.
            ->sortBy(fn (Society $society) => [$society->getAttribute('distance_km'), -(float) $society->score])
            ->take(40)
            ->values();

        return response()->json([
            'status' => 'ok',
            'landmark' => [
                'name' => $landmark->name,
                'category' => $landmark->category,
                'city' => $landmark->city,
                'latitude' => $landmark->latitude,
                'longitude' => $landmark->longitude,
            ],
            'radius_km' => $radius,
            'remainder' => $parsed['remainder'],
            'societies' => $societies->map(fn (Society $society) => [
                'id' => $society->id,
                'name' => $society->name,
                'slug' => $society->slug,
                'locality' => $society->locality,
                'sector' => $society->sector,
                'city' => $society->city,
                'score' => $society->score,
                'rent_range' => $society->rent_range,
                'buy_range' => $society->buy_range,
                'cover_image' => $society->cover_image,
                'image_status' => $society->image_status,
                'image_photo_reference' => $society->image_photo_reference,
                'distance_km' => $society->getAttribute('distance_km'),
            ]),
        ]);
    }

    /** The part of a query after the "near"-ish phrase, for a Google lookup. */
    private function landmarkPhrase(string $query): string
    {
        if (preg_match('/\b(?:near|close to|next to|around|beside|walking distance from)\s+(.+)$/i', $query, $m)) {
            return trim($m[1]);
        }

        return $query;
    }
}
