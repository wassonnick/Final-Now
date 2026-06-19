<?php

namespace App\Services;

use App\Models\Society;
use Illuminate\Support\Facades\Http;

class GooglePlacesNearbyIntelligenceService
{
    public function suggestionsForSociety(Society $society): array
    {
        $apiKey = trim((string) config('services.google_places_api_key', ''));

        if ($apiKey === '') {
            return [
                'success' => false,
                'message' => 'GOOGLE_PLACES_API_KEY is not configured on the backend.',
                'suggestions' => $this->emptySuggestions(),
                'meta' => [
                    'source' => 'google_places',
                    'status' => 'missing_api_key',
                ],
            ];
        }

        $latitude = $this->coordinate($society->latitude);
        $longitude = $this->coordinate($society->longitude);

        if (!$this->validCoordinates($latitude, $longitude)) {
            return [
                'success' => false,
                'message' => 'Add valid society latitude and longitude before auto-filling nearby intelligence.',
                'suggestions' => $this->emptySuggestions(),
                'meta' => [
                    'source' => 'google_places',
                    'status' => 'missing_coordinates',
                ],
            ];
        }

        $location = $latitude . ',' . $longitude;

        $categories = [
            'nearby_schools' => [
                'label' => 'Schools',
                'type' => 'school',
                'keyword' => 'school',
                'radius' => 4500,
                'limit' => 4,
            ],
            'nearby_metro' => [
                'label' => 'Metro / commute',
                'type' => 'subway_station',
                'keyword' => 'metro station rapid metro',
                'radius' => 6500,
                'limit' => 4,
            ],
            'nearby_hospitals' => [
                'label' => 'Hospitals',
                'type' => 'hospital',
                'keyword' => 'hospital',
                'radius' => 5500,
                'limit' => 4,
            ],
            'nearby_office_hubs' => [
                'label' => 'Office hubs',
                'type' => 'establishment',
                'keyword' => 'business park office hub cyber city golf course road',
                'radius' => 8500,
                'limit' => 4,
            ],
        ];

        $suggestions = [];
        $diagnostics = [];

        foreach ($categories as $field => $config) {
            $result = $this->nearbySearch(
                apiKey: $apiKey,
                location: $location,
                type: $config['type'],
                keyword: $config['keyword'],
                radius: $config['radius'],
                limit: $config['limit'],
            );

            $suggestions[$field] = $result['text'];
            $diagnostics[$field] = $result['meta'];
        }

        return [
            'success' => true,
            'message' => 'Nearby suggestions fetched from Google Places. Review before saving.',
            'suggestions' => $suggestions,
            'meta' => [
                'source' => 'google_places',
                'status' => 'suggestions_ready',
                'latitude' => $latitude,
                'longitude' => $longitude,
                'diagnostics' => $diagnostics,
                'review_note' => 'API-assisted nearby intelligence. Admin review required before publishing.',
            ],
        ];
    }

    private function nearbySearch(
        string $apiKey,
        string $location,
        string $type,
        string $keyword,
        int $radius,
        int $limit,
    ): array {
        try {
            $response = Http::timeout(14)->get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', [
                'key' => $apiKey,
                'location' => $location,
                'radius' => $radius,
                'type' => $type,
                'keyword' => $keyword,
            ]);

            if (!$response->ok()) {
                return [
                    'text' => '',
                    'meta' => [
                        'status' => 'http_error',
                        'http_status' => $response->status(),
                    ],
                ];
            }

            $json = $response->json();
            $placesStatus = (string) ($json['status'] ?? 'UNKNOWN');
            $results = is_array($json['results'] ?? null) ? $json['results'] : [];

            $lines = collect($results)
                ->take($limit)
                ->map(function (array $place) {
                    $name = trim((string) data_get($place, 'name', ''));
                    $vicinity = trim((string) data_get($place, 'vicinity', ''));
                    $rating = data_get($place, 'rating');

                    if ($name === '') {
                        return null;
                    }

                    $parts = [$name];

                    if ($vicinity !== '') {
                        $parts[] = $vicinity;
                    }

                    if ($rating !== null && $rating !== '') {
                        $parts[] = 'Google rating ' . $rating;
                    }

                    $parts[] = 'source: Google Places';

                    return implode(' — ', $parts);
                })
                ->filter()
                ->values()
                ->implode("\n");

            return [
                'text' => $lines,
                'meta' => [
                    'status' => $placesStatus,
                    'count' => count($results),
                    'used' => $lines === '' ? 0 : substr_count($lines, "\n") + 1,
                ],
            ];
        } catch (\Throwable $error) {
            return [
                'text' => '',
                'meta' => [
                    'status' => 'exception',
                    'message' => $error->getMessage(),
                ],
            ];
        }
    }

    private function emptySuggestions(): array
    {
        return [
            'nearby_schools' => '',
            'nearby_metro' => '',
            'nearby_hospitals' => '',
            'nearby_office_hubs' => '',
        ];
    }

    private function coordinate(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        $number = (float) $value;

        return is_finite($number) ? $number : null;
    }

    private function validCoordinates(?float $latitude, ?float $longitude): bool
    {
        if ($latitude === null || $longitude === null) {
            return false;
        }

        if ($latitude == 0.0 && $longitude == 0.0) {
            return false;
        }

        return $latitude >= -90 && $latitude <= 90 && $longitude >= -180 && $longitude <= 180;
    }
}
