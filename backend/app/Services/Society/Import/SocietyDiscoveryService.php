<?php

namespace App\Services\Society\Import;

use App\Models\City;
use App\Models\Society;
use App\Models\SocietyImportCandidate;
use App\Services\Ncr\CityResolver;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Finds societies that exist in the market but not in the catalogue.
 *
 * Every other importer answers "add the thing I already know about". This answers the
 * question nobody could ask before: what are we missing? Coverage was only ever visible as
 * a count, so a sector with four of its twenty societies looked identical to one with all
 * twenty — the gap was invisible precisely where it mattered most.
 *
 * Reads Google Places, diffs against the catalogue, and keeps what it learns. The diff is
 * the hard part and it fails in two directions: calling a society we already hold a gap
 * wastes an operator's time until they stop reading the queue, and calling a real gap a
 * duplicate hides it forever. So an uncertain match is neither — it is surfaced as a
 * likely duplicate, next to the society it resembles, for a person to judge.
 */
class SocietyDiscoveryService
{
    public function __construct(private readonly CityResolver $cities) {}

    /** Places returns at most 20 per text search; asking for more silently costs the same. */
    private const MAX_RESULTS = 20;

    /**
     * Place types that are never a residential society.
     *
     * A text search for apartments in a sector reliably returns the brokers who sell them,
     * the hotels beside them and the storage unit down the road.
     */
    private const REJECTED_TYPES = [
        'real_estate_agency', 'lodging', 'hotel', 'guest_house', 'hostel', 'storage',
        'moving_company', 'general_contractor', 'insurance_agency', 'bank', 'atm',
        'restaurant', 'cafe', 'store', 'shopping_mall', 'school', 'hospital', 'gym',
        'travel_agency', 'car_repair', 'furniture_store', 'corporate_office',
    ];

    /** Words that mark a listing as something other than a place people live. */
    private const REJECTED_WORDS = [
        'property dealer', 'properties', 'realtor', 'realty', 'real estate', 'consultant',
        'associates', 'brokers', 'broker', 'pg ', 'paying guest', 'hostel', 'office',
    ];

    public function configured(): bool
    {
        return trim((string) config('services.google_places_api_key', '')) !== '';
    }

    /**
     * Scan one area and record what is missing.
     *
     * @return array{status:string, area:string, scanned:int, new:int, likely_duplicate:int, known:int, rejected:int, message?:string}
     */
    public function scan(string $area, ?City $city = null): array
    {
        $area = trim($area);

        if ($area === '') {
            return $this->result('error', $area, message: 'Give an area to scan, for example "Sector 65 Gurgaon".');
        }

        if (! $this->configured()) {
            return $this->result('error', $area, message: 'Google Places API key is not configured.');
        }

        $places = $this->searchPlaces($area);

        if ($places === null) {
            return $this->result('error', $area, message: 'Google Places did not answer. Nothing was recorded.');
        }

        $counts = ['scanned' => 0, 'new' => 0, 'likely_duplicate' => 0, 'known' => 0, 'rejected' => 0];

        foreach ($places as $place) {
            $counts['scanned']++;

            $name = trim((string) data_get($place, 'displayName.text', ''));
            $placeId = trim((string) data_get($place, 'id', ''));

            if ($name === '' || $placeId === '') {
                $counts['rejected']++;

                continue;
            }

            if ($this->looksNonResidential($name, (array) ($place['types'] ?? []))) {
                $counts['rejected']++;

                continue;
            }

            $match = $this->matchExistingSociety($placeId, $name);

            if ($match['status'] === 'known') {
                $counts['known']++;
                // Still recorded, so a later rename cannot resurrect it as a false gap.
                $this->remember($place, $area, $city, SocietyImportCandidate::STATUS_IMPORTED, $match['reason'], $match['society']);

                continue;
            }

            $status = $match['status'] === 'likely_duplicate'
                ? SocietyImportCandidate::STATUS_LIKELY_DUPLICATE
                : SocietyImportCandidate::STATUS_NEW;

            $counts[$match['status'] === 'likely_duplicate' ? 'likely_duplicate' : 'new']++;
            $this->remember($place, $area, $city, $status, $match['reason'], $match['society']);
        }

        return $this->result('ok', $area, $counts);
    }

    /**
     * @return array<int,array<string,mixed>>|null
     */
    private function searchPlaces(string $area): ?array
    {
        $fields = implode(',', [
            'places.id', 'places.displayName', 'places.formattedAddress',
            'places.location', 'places.types', 'places.userRatingCount',
        ]);

        try {
            $response = Http::timeout(20)
                ->withHeaders([
                    'X-Goog-Api-Key' => trim((string) config('services.google_places_api_key', '')),
                    'X-Goog-FieldMask' => $fields,
                ])
                ->post('https://places.googleapis.com/v1/places:searchText', [
                    // "residential society" rather than "apartments": the latter is what
                    // estate agents call themselves, and it drags the whole broker industry
                    // into the results.
                    'textQuery' => 'residential society apartments in '.$area,
                    'maxResultCount' => self::MAX_RESULTS,
                ]);
        } catch (\Throwable $e) {
            Log::info('Society discovery search failed', ['area' => $area, 'error' => $e->getMessage()]);

            return null;
        }

        if (! $response->successful()) {
            Log::info('Society discovery search rejected', [
                'area' => $area,
                'status' => $response->status(),
                'body' => substr((string) $response->body(), 0, 300),
            ]);

            return null;
        }

        return (array) ($response->json('places') ?? []);
    }

    /**
     * @param  array<int,string>  $types
     */
    private function looksNonResidential(string $name, array $types): bool
    {
        foreach ($types as $type) {
            if (in_array((string) $type, self::REJECTED_TYPES, true)) {
                return true;
            }
        }

        $lower = ' '.mb_strtolower($name).' ';

        foreach (self::REJECTED_WORDS as $word) {
            if (str_contains($lower, $word)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array{status:string, reason:?string, society:?Society}
     */
    private function matchExistingSociety(string $placeId, string $name): array
    {
        // A place_id match is authoritative — it is Google's own identifier for the site,
        // so no amount of renaming can make it a different building.
        $byPlaceId = Society::query()->where('place_id', $placeId)->first();

        if ($byPlaceId) {
            return ['status' => 'known', 'reason' => 'Same Google place as '.$byPlaceId->name, 'society' => $byPlaceId];
        }

        $normalised = SocietyImportCandidate::normalise($name);

        if ($normalised === '') {
            return ['status' => 'new', 'reason' => null, 'society' => null];
        }

        foreach (Society::query()->get(['id', 'name']) as $society) {
            $existing = SocietyImportCandidate::normalise((string) $society->name);

            if ($existing === '') {
                continue;
            }

            if ($existing === $normalised) {
                return ['status' => 'known', 'reason' => 'Same name as '.$society->name, 'society' => $society];
            }

            // One name inside the other — "The Crest" against "DLF The Crest". Often the
            // same project under a builder prefix, sometimes genuinely different. Not a
            // call worth making automatically in either direction.
            if ($this->oneContainsTheOther($existing, $normalised)) {
                return ['status' => 'likely_duplicate', 'reason' => 'Looks like '.$society->name, 'society' => $society];
            }
        }

        return ['status' => 'new', 'reason' => null, 'society' => null];
    }

    private function oneContainsTheOther(string $a, string $b): bool
    {
        // Guarded by length: a two-word overlap is meaningful, "the" inside anything is not.
        $shorter = strlen($a) <= strlen($b) ? $a : $b;
        $longer = $shorter === $a ? $b : $a;

        return strlen($shorter) >= 8 && str_contains(' '.$longer.' ', ' '.$shorter.' ');
    }

    /**
     * @param  array<string,mixed>  $place
     */
    private function remember(array $place, string $area, ?City $city, string $status, ?string $reason, ?Society $society): void
    {
        $name = trim((string) data_get($place, 'displayName.text', ''));
        $existing = SocietyImportCandidate::where('place_id', (string) $place['id'])->first();

        // A dismissal is a decision about the place, not about one scan. Re-finding it must
        // not undo it, or the queue fills back up with the same rejects every week.
        if ($existing && $existing->status === SocietyImportCandidate::STATUS_DISMISSED) {
            $existing->update(['last_seen_at' => now()]);

            return;
        }

        SocietyImportCandidate::updateOrCreate(
            ['place_id' => (string) $place['id']],
            [
                'name' => $name,
                'normalised_name' => SocietyImportCandidate::normalise($name),
                'address' => (string) ($place['formattedAddress'] ?? ''),
                'area' => $area,
                'city' => $city?->name ?: $this->cities->fromAddress((string) ($place['formattedAddress'] ?? ''))?->name,
                'city_id' => $city?->id ?: $this->cities->fromAddress((string) ($place['formattedAddress'] ?? ''))?->id,
                'latitude' => data_get($place, 'location.latitude'),
                'longitude' => data_get($place, 'location.longitude'),
                'types' => (array) ($place['types'] ?? []),
                'rating_count' => (int) ($place['userRatingCount'] ?? 0),
                'status' => $existing?->status === SocietyImportCandidate::STATUS_IMPORTED && $status !== SocietyImportCandidate::STATUS_IMPORTED
                    ? SocietyImportCandidate::STATUS_IMPORTED
                    : $status,
                'status_reason' => $reason,
                'society_id' => $society?->id,
                'first_seen_at' => $existing?->first_seen_at ?? now(),
                'last_seen_at' => now(),
            ],
        );
    }

    /**
     * @param  array<string,int>  $counts
     * @return array<string,mixed>
     */
    private function result(string $status, string $area, array $counts = [], ?string $message = null): array
    {
        return array_filter([
            'status' => $status,
            'area' => $area,
            'scanned' => $counts['scanned'] ?? 0,
            'new' => $counts['new'] ?? 0,
            'likely_duplicate' => $counts['likely_duplicate'] ?? 0,
            'known' => $counts['known'] ?? 0,
            'rejected' => $counts['rejected'] ?? 0,
            'message' => $message,
        ], fn ($value) => $value !== null);
    }
}
