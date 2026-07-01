<?php

namespace App\Services\VerifiedSocietyImporter;

use App\Services\Society\Import\PlaceResolverService;

class SocietyImportGooglePlacesService
{
    public function __construct(private PlaceResolverService $places) {}

    public function available(): bool
    {
        return $this->places->configured();
    }

    /**
     * Resolve only facts owned by Google Places. Market data, scores, amenities,
     * RERA details and descriptive copy deliberately remain untouched.
     */
    public function enrich(array $input): array
    {
        if (! $this->available()) {
            return [
                'status' => 'unavailable',
                'message' => 'Google Places is not configured; the review-only draft was created from supplied fields.',
                'data' => [],
            ];
        }

        $location = implode(', ', array_values(array_unique(array_filter([
            $input['address'] ?? null,
            $input['sector'] ?? null,
            $input['locality'] ?? null,
            $input['city'] ?? 'Gurugram',
            $input['state'] ?? 'Haryana',
        ]))));

        $place = $this->places->resolve(
            (string) ($input['name'] ?? ''),
            $location,
            filled($input['google_place_id'] ?? null) ? (string) $input['google_place_id'] : null,
        );

        if (! ($place['matched'] ?? false)) {
            return [
                'status' => 'not_matched',
                'message' => 'No reliable Google Places match was found; the review-only draft was created from supplied fields.',
                'data' => [],
            ];
        }

        $data = [
            'google_place_id' => $place['place_id'] ?? null,
            'google_maps_url' => $place['google_maps_url'] ?? null,
            'latitude' => $place['latitude'] ?? null,
            'longitude' => $place['longitude'] ?? null,
            'address' => $place['formatted_address'] ?? null,
            'sector' => $place['sector'] ?? null,
            'locality' => $place['locality'] ?? null,
            'city' => $place['city'] ?? null,
            'state' => $place['state'] ?? null,
            'official_project_url' => $place['website'] ?? null,
            'google_photo_references' => $place['photo_references'] ?? [],
            'image_attribution' => ! empty($place['photo_references']) ? 'Google Places' : null,
        ];

        $data = array_filter($data, fn ($value) => $value !== null && $value !== '' && $value !== []);

        return [
            'status' => 'enriched',
            'message' => 'Google Places matched the society and supplied reviewable location and image-reference facts.',
            'data' => $data,
            'raw_response' => $place,
        ];
    }
}
