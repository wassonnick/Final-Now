<?php

namespace App\Services\Society\Import;

use Illuminate\Support\Facades\Http;

/**
 * Stage 2 of the importer: neighborhood facts around the AUTHORITATIVE society
 * coordinates. Returns structured POIs with REAL haversine-measured distances
 * (metres) — these feed the connectivity/lifestyle scoring deterministically —
 * plus ready-to-store text lines for the society's nearby_* fields.
 *
 * New, distance-aware service so the existing (text-only, radius-only)
 * GooglePlacesNearbyIntelligenceService used by SocietyController is left intact.
 */
class NeighborhoodIntelService
{
    private const CATEGORIES = [
        'schools' => ['field' => 'nearby_schools', 'type' => 'school', 'keyword' => 'school', 'radius' => 4500, 'limit' => 5],
        'metro' => ['field' => 'nearby_metro', 'type' => 'subway_station', 'keyword' => 'metro station', 'radius' => 7000, 'limit' => 4],
        'hospitals' => ['field' => 'nearby_hospitals', 'type' => 'hospital', 'keyword' => 'hospital', 'radius' => 6000, 'limit' => 5],
        'office' => ['field' => 'nearby_office_hubs', 'type' => 'establishment', 'keyword' => 'business park office it park corporate', 'radius' => 11000, 'limit' => 5],
        'lifestyle' => ['field' => null, 'type' => 'shopping_mall', 'keyword' => 'mall market restaurant cafe', 'radius' => 5000, 'limit' => 8],
    ];

    public function configured(): bool
    {
        return trim((string) config('services.google_places_api_key', '')) !== '';
    }

    /**
     * @return array{available: bool, reason?: string, nearby: array<string,array>, lines: array<string,array<int,string>>}
     */
    public function gather(?float $lat, ?float $lng): array
    {
        $apiKey = trim((string) config('services.google_places_api_key', ''));
        if ($apiKey === '') {
            return ['available' => false, 'reason' => 'google_places_api_key not configured', 'nearby' => [], 'lines' => []];
        }
        if ($lat === null || $lng === null || ($lat == 0.0 && $lng == 0.0)) {
            return ['available' => false, 'reason' => 'missing coordinates', 'nearby' => [], 'lines' => []];
        }

        $nearby = [];
        $lines = [];

        foreach (self::CATEGORIES as $key => $cfg) {
            $places = $this->search($apiKey, $lat, $lng, $cfg);
            $nearby[$key] = $places;

            // nearby_* columns are array-cast, so store one formatted line per POI.
            if ($cfg['field'] !== null && $places !== []) {
                $lines[$cfg['field']] = $this->toLines($places);
            }
        }

        return ['available' => true, 'nearby' => $nearby, 'lines' => $lines];
    }

    private function search(string $apiKey, float $lat, float $lng, array $cfg): array
    {
        try {
            $response = Http::timeout(14)->get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', [
                'key' => $apiKey,
                'location' => $lat.','.$lng,
                'radius' => $cfg['radius'],
                'type' => $cfg['type'],
                'keyword' => $cfg['keyword'],
            ]);

            if (! $response->ok()) {
                return [];
            }

            $results = (array) ($response->json()['results'] ?? []);
        } catch (\Throwable) {
            return [];
        }

        $places = [];
        foreach ($results as $place) {
            $name = trim((string) ($place['name'] ?? ''));
            $pLat = $place['geometry']['location']['lat'] ?? null;
            $pLng = $place['geometry']['location']['lng'] ?? null;
            if ($name === '' || $pLat === null || $pLng === null) {
                continue;
            }

            $places[] = [
                'name' => $name,
                'vicinity' => trim((string) ($place['vicinity'] ?? '')) ?: null,
                'rating' => isset($place['rating']) ? (float) $place['rating'] : null,
                'distance_m' => (int) round($this->haversine($lat, $lng, (float) $pLat, (float) $pLng)),
            ];
        }

        usort($places, fn ($a, $b) => $a['distance_m'] <=> $b['distance_m']);

        return array_slice($places, 0, $cfg['limit']);
    }

    /** @return array<int,string> */
    private function toLines(array $places): array
    {
        return collect($places)->map(function (array $p) {
            $parts = [$p['name']];
            if ($p['vicinity']) {
                $parts[] = $p['vicinity'];
            }
            $parts[] = round($p['distance_m'] / 1000, 1).' km';
            if ($p['rating'] !== null) {
                $parts[] = 'Google rating '.$p['rating'];
            }
            $parts[] = 'source: Google Places';

            return implode(' — ', $parts);
        })->values()->all();
    }

    private function haversine(float $lat1, float $lng1, float $lat2, float $lng2): float
    {
        $r = 6371000.0;
        $dLat = deg2rad($lat2 - $lat1);
        $dLng = deg2rad($lng2 - $lng1);
        $a = sin($dLat / 2) ** 2 + cos(deg2rad($lat1)) * cos(deg2rad($lat2)) * sin($dLng / 2) ** 2;

        return $r * 2 * atan2(sqrt($a), sqrt(1 - $a));
    }
}
