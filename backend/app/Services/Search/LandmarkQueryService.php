<?php

namespace App\Services\Search;

use App\Models\Landmark;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Reads a search the way a person wrote it.
 *
 * "3 bhk near ambience mall", "flat close to cyber hub under 60k", "walking distance from
 * huda city centre" — the landmark is the part that matters and it was the part search
 * could not see. Everything else in the phrase is left alone and handed back, so the
 * existing filters keep working on the rest.
 */
class LandmarkQueryService
{
    /**
     * Phrases that introduce a landmark, longest first so "walking distance from" is not
     * read as the bare "from" with "walking distance" left dangling in the query.
     */
    private const NEAR_PHRASES = [
        'within walking distance of',
        'within walking distance from',
        'walking distance from',
        'walking distance to',
        'in the vicinity of',
        'a short drive from',
        'commutable from',
        'close proximity to',
        'right next to',
        'closest to',
        'close to',
        'next to',
        'nearby',
        'near to',
        'near',
        'around',
        'beside',
    ];

    /** Words a person adds that are not part of a landmark's name. */
    private const TRAILING_NOISE = [
        'metro station', 'metro', 'station', 'area', 'road', 'gurgaon', 'gurugram',
        'delhi', 'noida', 'ncr', 'please', 'thanks',
    ];

    /**
     * @return array{landmark:?Landmark, radius_km:?float, remainder:string, phrase:?string}
     */
    public function parse(string $query): array
    {
        $clean = trim(preg_replace('/\s+/', ' ', $query) ?? '');
        $lower = Str::lower($clean);

        // "within 3 km of X" — the number is the radius, not part of the name.
        $radius = null;
        if (preg_match('/(?:within\s+)?(\d+(?:\.\d+)?)\s*(km|kms|kilometers|kilometres|minutes|mins)\s+(?:of|from|to)\s+/i', $lower, $m, PREG_OFFSET_CAPTURE)) {
            $value = (float) $m[1][0];
            // Minutes are a distance in disguise; ~500 m a minute is honest for city driving.
            $radius = str_starts_with(Str::lower($m[2][0]), 'min') ? round($value * 0.5, 1) : $value;
            $lower = substr($lower, 0, $m[0][1]).' near '.substr($lower, $m[0][1] + strlen($m[0][0]));
            $lower = trim(preg_replace('/\s+/', ' ', $lower) ?? $lower);
        }

        foreach (self::NEAR_PHRASES as $phrase) {
            $position = strpos($lower, ' '.$phrase.' ');
            $atStart = str_starts_with($lower, $phrase.' ');

            if ($position === false && ! $atStart) {
                continue;
            }

            $offset = $atStart ? 0 : $position + 1;
            $before = trim(substr($lower, 0, $offset));
            $after = trim(substr($lower, $offset + strlen($phrase)));

            if ($after === '') {
                continue;
            }

            $landmark = $this->resolve($after);

            if (! $landmark) {
                continue;
            }

            return [
                'landmark' => $landmark,
                'radius_km' => $radius,
                // What is left is still a search: "3 bhk", "under 60k", "pet friendly".
                'remainder' => trim($before),
                'phrase' => $phrase,
            ];
        }

        return ['landmark' => null, 'radius_km' => $radius, 'remainder' => $clean, 'phrase' => null];
    }

    /**
     * Find the landmark someone named, trying the longest reading of the phrase first.
     *
     * "ambience mall gurgaon sector 24" should match Ambience Mall and leave the rest, so
     * candidates are tested from the whole tail down to the first two words.
     */
    public function resolve(string $text): ?Landmark
    {
        $words = array_values(array_filter(explode(' ', Str::lower(trim($text)))));

        if ($words === []) {
            return null;
        }

        $landmarks = Landmark::all();

        for ($length = count($words); $length >= 1; $length--) {
            $candidate = implode(' ', array_slice($words, 0, $length));

            // Compared both ways round. Stripping the city helps "ambience mall gurgaon"
            // find "Ambience Mall", and hurts "sector 18 noida", whose alias carries the
            // city — so the query and the landmark are each tried whole and trimmed.
            $keys = array_filter([
                Landmark::matchKey($candidate),
                Landmark::matchKey($this->stripTrailingNoise($candidate)),
            ], fn ($key) => strlen($key) >= 4);

            if ($keys === []) {
                continue;
            }

            foreach ($landmarks as $landmark) {
                if (array_intersect($keys, $landmark->matchKeys()) !== []) {
                    return $landmark;
                }
            }
        }

        return null;
    }

    /** "ambience mall gurgaon" and "huda city centre metro station" name the same places. */
    private function stripTrailingNoise(string $value): string
    {
        $changed = true;

        while ($changed) {
            $changed = false;

            foreach (self::TRAILING_NOISE as $noise) {
                $trimmed = preg_replace('/\s+'.preg_quote($noise, '/').'\s*$/i', '', $value) ?? $value;

                if ($trimmed !== $value && trim($trimmed) !== '') {
                    $value = trim($trimmed);
                    $changed = true;
                }
            }
        }

        return $value;
    }

    /**
     * Learn a landmark we do not carry, once, from Google.
     *
     * Called only when the curated list misses, and the result is saved — so an unusual
     * landmark costs one lookup ever rather than one per search.
     */
    public function learn(string $text, ?string $city = null): ?Landmark
    {
        $key = trim($text);
        $apiKey = trim((string) config('services.google_places_api_key', ''));

        if ($key === '' || $apiKey === '') {
            return null;
        }

        try {
            $response = Http::timeout(12)
                ->withHeaders([
                    'X-Goog-Api-Key' => $apiKey,
                    'X-Goog-FieldMask' => 'places.id,places.displayName,places.location,places.formattedAddress,places.types',
                ])
                ->post('https://places.googleapis.com/v1/places:searchText', [
                    'textQuery' => $key.' '.($city ?: 'Delhi NCR'),
                    'pageSize' => 1,
                ]);
        } catch (\Throwable) {
            return null;
        }

        $place = $response->successful() ? ($response->json('places')[0] ?? null) : null;
        $latitude = data_get($place, 'location.latitude');
        $longitude = data_get($place, 'location.longitude');

        if (! $place || $latitude === null || $longitude === null) {
            return null;
        }

        $name = (string) data_get($place, 'displayName.text', $key);

        return Landmark::updateOrCreate(
            ['slug' => Str::slug($name)],
            [
                'name' => $name,
                'aliases' => [$key],
                'category' => 'discovered',
                'city' => $city,
                'latitude' => $latitude,
                'longitude' => $longitude,
                'source' => 'google_places',
                'place_id' => data_get($place, 'id'),
            ],
        );
    }
}
