<?php

namespace App\Services\Society\Import;

use Illuminate\Support\Facades\Http;

/**
 * Stage 0–1 of the importer: resolve a society to a real Google Place and pull
 * the AUTHORITATIVE facts only Google should own — coordinates, formatted
 * address + components, rating, maps URL, website and photo references.
 *
 * These never come from the LLM. Everything returned here is tagged with a high
 * provenance confidence by the pipeline. Failures degrade gracefully to
 * ['matched' => false] so a draft can still be created from name + Gemini.
 */
class PlaceResolverService
{
    private const DETAIL_FIELDS = 'place_id,name,formatted_address,geometry,url,website,rating,user_ratings_total,photos,types,address_components';

    public function configured(): bool
    {
        return trim((string) config('services.google_places_api_key', '')) !== '';
    }

    /**
     * @return array{matched: bool, reason?: string, place_id?: string, ...}
     */
    public function resolve(string $name, ?string $location = null, ?string $existingPlaceId = null): array
    {
        $apiKey = trim((string) config('services.google_places_api_key', ''));
        if ($apiKey === '') {
            return ['matched' => false, 'reason' => 'google_places_api_key not configured'];
        }

        try {
            $placeId = $existingPlaceId ?: $this->findPlaceId($name, $location, $apiKey);
            if ($placeId === null) {
                return ['matched' => false, 'reason' => 'no Google Places match'];
            }

            $details = $this->placeDetails($placeId, $apiKey);
            if ($details === null) {
                return ['matched' => false, 'reason' => 'place details unavailable'];
            }

            return $this->shape($details, $name);
        } catch (\Throwable $e) {
            return ['matched' => false, 'reason' => 'place lookup error: '.$e->getMessage()];
        }
    }

    private function findPlaceId(string $name, ?string $location, string $apiKey): ?string
    {
        $query = trim($name.' '.(string) $location);

        $response = Http::timeout(12)->get('https://maps.googleapis.com/maps/api/place/findplacefromtext/json', [
            'input' => $query,
            'inputtype' => 'textquery',
            'fields' => 'place_id',
            'key' => $apiKey,
        ]);

        if (! $response->ok()) {
            return null;
        }

        $json = $response->json();
        if (! in_array((string) ($json['status'] ?? ''), ['OK', 'ZERO_RESULTS'], true)) {
            return null;
        }

        return $json['candidates'][0]['place_id'] ?? null;
    }

    private function placeDetails(string $placeId, string $apiKey): ?array
    {
        $response = Http::timeout(12)->get('https://maps.googleapis.com/maps/api/place/details/json', [
            'place_id' => $placeId,
            'fields' => self::DETAIL_FIELDS,
            'key' => $apiKey,
        ]);

        if (! $response->ok()) {
            return null;
        }

        $json = $response->json();
        if (! in_array((string) ($json['status'] ?? ''), ['OK', 'ZERO_RESULTS'], true)) {
            return null;
        }

        return $json['result'] ?? null;
    }

    private function shape(array $place, string $fallbackName): array
    {
        $components = $place['address_components'] ?? [];
        $formatted = (string) ($place['formatted_address'] ?? '');
        $name = (string) ($place['name'] ?? $fallbackName);

        $lat = $place['geometry']['location']['lat'] ?? null;
        $lng = $place['geometry']['location']['lng'] ?? null;

        $photoRefs = collect($place['photos'] ?? [])
            ->pluck('photo_reference')
            ->filter(fn ($ref) => is_string($ref) && $ref !== '')
            ->take(10)
            ->values()
            ->all();

        return [
            'matched' => true,
            'place_id' => (string) ($place['place_id'] ?? ''),
            'name' => $name,
            'formatted_address' => $formatted ?: null,
            'latitude' => $lat !== null ? round((float) $lat, 7) : null,
            'longitude' => $lng !== null ? round((float) $lng, 7) : null,
            'sector' => $this->parseSector($name, $formatted),
            'locality' => $this->component($components, ['sublocality_level_1', 'sublocality', 'neighborhood'])
                ?? $this->component($components, ['administrative_area_level_3']),
            'city' => $this->component($components, ['locality', 'administrative_area_level_2']),
            'state' => $this->component($components, ['administrative_area_level_1']),
            'google_maps_url' => $place['url'] ?? null,
            'website' => $this->cleanWebsite($place['website'] ?? null),
            'rating' => isset($place['rating']) ? (float) $place['rating'] : null,
            'rating_count' => isset($place['user_ratings_total']) ? (int) $place['user_ratings_total'] : null,
            'types' => array_values(array_filter((array) ($place['types'] ?? []))),
            'photo_references' => $photoRefs,
        ];
    }

    private function component(array $components, array $types): ?string
    {
        foreach ($types as $type) {
            foreach ($components as $component) {
                if (in_array($type, (array) ($component['types'] ?? []), true)) {
                    $value = trim((string) ($component['long_name'] ?? ''));
                    if ($value !== '') {
                        return $value;
                    }
                }
            }
        }

        return null;
    }

    private function parseSector(string $name, string $address): ?string
    {
        foreach ([$name, $address] as $text) {
            if (preg_match('/sector\s*-?\s*(\d+\s*[A-Za-z]?)/i', $text, $m)) {
                return 'Sector '.strtoupper(preg_replace('/\s+/', '', $m[1]));
            }
        }

        return null;
    }

    private function cleanWebsite(?string $website): ?string
    {
        $website = trim((string) $website);

        return $website !== '' && filter_var($website, FILTER_VALIDATE_URL) ? $website : null;
    }
}
