<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Street View as a last-resort image source for societies Google Places cannot picture.
 *
 * Places holds a photo only when a visitor uploaded one, which is why roughly forty
 * societies came out of the restore with nothing. Street View coverage is independent of
 * that: it exists for essentially every road in Gurgaon, and we already hold coordinates
 * for every society from the Places lookup.
 *
 * It is deliberately the last source tried. A road-facing frame of a gated society is
 * often its entrance or a boundary wall rather than its towers — better than a
 * placeholder, worse than a real photograph — so it fills gaps and never competes.
 */
class GoogleStreetViewService
{
    /** Synthetic reference prefix, so the existing photo proxy can serve these unchanged. */
    public const REFERENCE_PREFIX = 'streetview:';

    /**
     * Is there imagery at this point?
     *
     * The metadata endpoint is free and billed at zero, so every candidate location can be
     * checked before a single paid image is fetched.
     */
    public function hasImagery(float $latitude, float $longitude): bool
    {
        return $this->coverageStatus($latitude, $longitude) === 'OK';
    }

    /**
     * Google's own word for what is at this point.
     *
     * Returned rather than reduced to a boolean because the two failure modes need
     * opposite responses and look identical from outside: ZERO_RESULTS means Street View
     * genuinely has nothing there, while REQUEST_DENIED means the Street View Static API
     * is not enabled on the project or the key is not permitted to call it. Collapsing
     * both to false would have reported a configuration mistake as "no coverage" for every
     * society in the catalogue, which is the kind of misdirection that costs hours.
     */
    public function coverageStatus(float $latitude, float $longitude): string
    {
        $key = trim((string) config('services.google_places_api_key', ''));

        if ($key === '') {
            return 'NO_API_KEY';
        }

        try {
            $response = Http::timeout(10)->get('https://maps.googleapis.com/maps/api/streetview/metadata', [
                'location' => $latitude.','.$longitude,
                'radius' => 60,
                'source' => 'outdoor',
                'key' => $key,
            ]);

            if (! $response->ok()) {
                return 'HTTP_'.$response->status();
            }

            return (string) ($response->json('status') ?? 'UNKNOWN');
        } catch (\Throwable $e) {
            Log::info('Street View metadata check failed', ['error' => $e->getMessage()]);

            return 'REQUEST_FAILED';
        }
    }

    /** Does this status mean "we cannot call the API", as opposed to "nothing is there"? */
    public function statusIsConfigurationProblem(string $status): bool
    {
        return ! in_array($status, ['OK', 'ZERO_RESULTS', 'NOT_FOUND'], true);
    }

    /**
     * A pinned map of the society's location.
     *
     * The last resort, and the only source that is always available and never wrong. A
     * Street View frame can be a boundary wall or a field of pylons — misleading, because
     * it claims to show the property. A map claims only to show where the society is, and
     * that is true for every society with coordinates.
     */
    public const MAP_PREFIX = 'staticmap:';

    public function mapReference(float $latitude, float $longitude): string
    {
        return self::MAP_PREFIX.round($latitude, 6).','.round($longitude, 6);
    }

    /** @return array{body:string, content_type:string} */
    public function fetchMap(string $reference, int $maxWidth = 1200): array
    {
        $key = trim((string) config('services.google_places_api_key', ''));
        $point = $this->parsePoint($reference, self::MAP_PREFIX);

        if ($key === '') {
            throw new \InvalidArgumentException('Google Places API key is not configured.');
        }

        if ($point === null) {
            throw new \RuntimeException('Malformed static map reference: '.$reference);
        }

        $width = max(400, min($maxWidth, 640));
        $location = $point['latitude'].','.$point['longitude'];

        $response = Http::timeout(18)->get('https://maps.googleapis.com/maps/api/staticmap', [
            'center' => $location,
            'zoom' => 15,
            'size' => $width.'x'.(int) round($width * 0.625),
            'scale' => 2,
            'maptype' => 'roadmap',
            'markers' => 'color:red|'.$location,
            'key' => $key,
        ]);

        if (! $response->ok()) {
            throw new \RuntimeException('Static map request failed (HTTP '.$response->status().').');
        }

        $contentType = (string) ($response->header('Content-Type') ?: 'image/png');

        if (! str_starts_with(strtolower($contentType), 'image/')) {
            throw new \RuntimeException('Static map returned '.$contentType.' rather than an image.');
        }

        return ['body' => (string) $response->body(), 'content_type' => $contentType];
    }

    /** @return array{latitude:float, longitude:float}|null */
    private function parsePoint(string $reference, string $prefix): ?array
    {
        if (! str_starts_with($reference, $prefix)) {
            return null;
        }

        $parts = explode(',', substr($reference, strlen($prefix)));

        if (count($parts) !== 2 || ! is_numeric($parts[0]) || ! is_numeric($parts[1])) {
            return null;
        }

        return ['latitude' => (float) $parts[0], 'longitude' => (float) $parts[1]];
    }

    public function reference(float $latitude, float $longitude): string
    {
        return self::REFERENCE_PREFIX.round($latitude, 6).','.round($longitude, 6);
    }

    /** @return array{latitude:float, longitude:float}|null */
    public function parseReference(string $reference): ?array
    {
        if (! str_starts_with($reference, self::REFERENCE_PREFIX)) {
            return null;
        }

        $parts = explode(',', substr($reference, strlen(self::REFERENCE_PREFIX)));

        if (count($parts) !== 2 || ! is_numeric($parts[0]) || ! is_numeric($parts[1])) {
            return null;
        }

        return ['latitude' => (float) $parts[0], 'longitude' => (float) $parts[1]];
    }

    /**
     * @return array{body:string, content_type:string}
     */
    public function fetch(string $reference, int $maxWidth = 1200): array
    {
        $key = trim((string) config('services.google_places_api_key', ''));
        $point = $this->parseReference($reference);

        if ($key === '') {
            throw new \InvalidArgumentException('Google Places API key is not configured.');
        }

        if ($point === null) {
            throw new \RuntimeException('Malformed Street View reference: '.$reference);
        }

        $width = max(400, min($maxWidth, 640));

        $response = Http::timeout(18)->get('https://maps.googleapis.com/maps/api/streetview', [
            'size' => $width.'x'.(int) round($width * 0.625),
            'location' => $point['latitude'].','.$point['longitude'],
            'fov' => 80,     // a little wider than default; gated entrances are set back
            'pitch' => 5,    // tilt up slightly, so towers are in frame rather than tarmac
            'radius' => 60,
            'source' => 'outdoor',
            'return_error_code' => 'true',
            'key' => $key,
        ]);

        if (! $response->ok()) {
            throw new \RuntimeException('Street View request failed (HTTP '.$response->status().').');
        }

        $contentType = (string) ($response->header('Content-Type') ?: 'image/jpeg');

        if (! str_starts_with(strtolower($contentType), 'image/')) {
            throw new \RuntimeException('Street View returned '.$contentType.' rather than an image.');
        }

        return ['body' => (string) $response->body(), 'content_type' => $contentType];
    }
}
