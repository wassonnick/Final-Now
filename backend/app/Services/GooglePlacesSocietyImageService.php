<?php

namespace App\Services;

use App\Models\Society;
use Illuminate\Support\Facades\Http;

class GooglePlacesSocietyImageService
{
    public function findImageReference(Society $society): array
    {
        $apiKey = trim((string) config('services.google_places_api_key', ''));

        if ($apiKey === '') {
            throw new \InvalidArgumentException('Google Places API key is not configured.');
        }

        $place = $this->resolvePlace($society, $apiKey);
        $photoReference = $place['photos'][0]['photo_reference'] ?? null;

        if (!$photoReference) {
            throw new \RuntimeException('No Google Places photo was found for this society.');
        }

        $placeId = (string) ($place['place_id'] ?? $society->place_id ?? '');
        $placeName = (string) ($place['name'] ?? $society->name);
        $placeAddress = (string) ($place['formatted_address'] ?? $society->address ?? '');
        $placeUrl = $place['url'] ?? ($placeId ? 'https://www.google.com/maps/search/?api=1&query=Google&query_place_id=' . rawurlencode($placeId) : null);

        return [
            'place_id' => $placeId ?: null,
            'place_name' => $placeName ?: $society->name,
            'formatted_address' => $placeAddress ?: null,
            'place_url' => $placeUrl,
            'photo_reference' => $photoReference,
            'photo_url' => 'https://maps.googleapis.com/maps/api/place/photo?maxwidth=1400&photo_reference=' . rawurlencode((string) $photoReference) . '&key=' . rawurlencode($apiKey),
            'credit' => 'Google Places',
            'license_note' => 'Google Places photo reference only. Admin must review Google attribution, usage terms and display rules before approving for live use.',
        ];
    }

    private function resolvePlace(Society $society, string $apiKey): array
    {
        if (!empty($society->place_id)) {
            $details = $this->placeDetails((string) $society->place_id, $apiKey);

            if ($details) {
                return $details;
            }
        }

        $query = $this->buildQuery($society);
        $candidate = $this->findPlaceFromText($query, $apiKey);

        if (!$candidate || empty($candidate['place_id'])) {
            throw new \RuntimeException('No Google Places match was found for this society.');
        }

        return $this->placeDetails((string) $candidate['place_id'], $apiKey) ?: $candidate;
    }

    private function buildQuery(Society $society): string
    {
        $parts = array_filter([
            $society->name,
            $society->sector,
            $society->locality,
            $society->address,
            $society->city ?: 'Gurugram',
            $society->state ?: 'Haryana',
        ]);

        return trim(implode(', ', array_unique($parts)));
    }

    private function findPlaceFromText(string $query, string $apiKey): ?array
    {
        $response = Http::timeout(12)->get('https://maps.googleapis.com/maps/api/place/findplacefromtext/json', [
            'input' => $query,
            'inputtype' => 'textquery',
            'fields' => 'place_id,name,formatted_address,photos',
            'key' => $apiKey,
        ]);

        if (!$response->ok()) {
            throw new \RuntimeException('Google Places find-place request failed.');
        }

        $json = $response->json();
        $status = (string) ($json['status'] ?? '');

        if (!in_array($status, ['OK', 'ZERO_RESULTS'], true)) {
            throw new \RuntimeException((string) ($json['error_message'] ?? 'Google Places find-place returned ' . $status));
        }

        return $json['candidates'][0] ?? null;
    }

    private function placeDetails(string $placeId, string $apiKey): ?array
    {
        $response = Http::timeout(12)->get('https://maps.googleapis.com/maps/api/place/details/json', [
            'place_id' => $placeId,
            'fields' => 'place_id,name,formatted_address,photos,url',
            'key' => $apiKey,
        ]);

        if (!$response->ok()) {
            throw new \RuntimeException('Google Places details request failed.');
        }

        $json = $response->json();
        $status = (string) ($json['status'] ?? '');

        if (!in_array($status, ['OK', 'ZERO_RESULTS'], true)) {
            throw new \RuntimeException((string) ($json['error_message'] ?? 'Google Places details returned ' . $status));
        }

        return $json['result'] ?? null;
    }
}
