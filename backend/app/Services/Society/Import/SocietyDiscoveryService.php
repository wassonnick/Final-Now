<?php

namespace App\Services\Society\Import;

use App\Models\City;
use App\Models\Society;
use App\Models\SocietyImportCandidate;
use App\Services\Ncr\CityResolver;
use App\Services\Ncr\LocalityNameService;
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
    public function __construct(
        private readonly CityResolver $cities,
        private readonly LocalityNameService $names,
    ) {}

    /** Google's per-page maximum; asking for more is silently capped at this. */
    private const PAGE_SIZE = 20;

    /**
     * Google returns at most 60 results across all pages of one text search, so three pages
     * is the ceiling and a fourth request would be wasted money. A dense area holds more
     * than sixty societies — the honest answer there is a narrower query, which is why the
     * scan reports when it hit the cap rather than implying it saw everything.
     */
    private const MAX_PAGES = 3;

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
        $capped = count($places) >= self::PAGE_SIZE * self::MAX_PAGES;

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

        return $this->result('ok', $area, $counts, $capped
            ? 'Google caps one search at 60 results and returned all 60, so this area almost certainly holds more. Scan its neighbourhoods or sectors separately to see the rest.'
            : null);
    }

    /**
     * @return array<int,array<string,mixed>>|null
     */
    private function searchPlaces(string $area): ?array
    {
        $fields = implode(',', [
            'nextPageToken',
            'places.id', 'places.displayName', 'places.formattedAddress',
            'places.location', 'places.types', 'places.userRatingCount',
        ]);

        $places = [];
        $pageToken = null;

        // Google returns one page of 20 and a token for the next. Without following it a
        // scan saw only the first twenty and rescanning returned the same twenty forever,
        // so an area was permanently capped at whatever Google ranked highest.
        for ($page = 0; $page < self::MAX_PAGES; $page++) {
            $body = [
                // "residential society" rather than "apartments": the latter is what estate
                // agents call themselves, and it drags the whole broker industry into the
                // results.
                'textQuery' => 'residential society apartments in '.$area,
                'pageSize' => self::PAGE_SIZE,
            ];

            // Every other parameter has to match the request that produced the token, so the
            // body is rebuilt identically each time and only this is added.
            if ($pageToken !== null) {
                $body['pageToken'] = $pageToken;
            }

            try {
                $response = Http::timeout(20)
                    ->withHeaders([
                        'X-Goog-Api-Key' => trim((string) config('services.google_places_api_key', '')),
                        'X-Goog-FieldMask' => $fields,
                    ])
                    ->post('https://places.googleapis.com/v1/places:searchText', $body);
            } catch (\Throwable $e) {
                Log::info('Society discovery search failed', ['area' => $area, 'page' => $page, 'error' => $e->getMessage()]);

                // A later page failing is not a reason to throw away the earlier ones.
                return $places === [] ? null : $places;
            }

            if (! $response->successful()) {
                Log::info('Society discovery search rejected', [
                    'area' => $area,
                    'page' => $page,
                    'status' => $response->status(),
                    'body' => substr((string) $response->body(), 0, 300),
                ]);

                return $places === [] ? null : $places;
            }

            $places = array_merge($places, (array) ($response->json('places') ?? []));
            $pageToken = $response->json('nextPageToken');

            if (! is_string($pageToken) || $pageToken === '') {
                break;
            }
        }

        return $places;
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
                // The neighbourhood, as distinct from the phrase typed into the scan box.
                'locality' => $this->localityFromAddress((string) ($place['formattedAddress'] ?? ''), $name),
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

    /**
     * The neighbourhood a Google address puts this place in.
     *
     * `area` is the phrase typed into the scan box — "West Delhi", "Pitampura Delhi" — which
     * is a search term. Using it as the locality gave eighteen societies a page called
     * "Pitampura Delhi" beside the real Pitampura, and would have done the same to Greater
     * Noida on the next scan.
     *
     * Google writes an address outwards, so the component immediately before the city is the
     * neighbourhood: "…, Pocket 37, Sector 13, Rohini, New Delhi, Delhi, 110085, India".
     */
    private function localityFromAddress(string $address, string $placeName): ?string
    {
        $parts = collect(explode(',', $address))
            ->map(fn ($part) => trim((string) $part))
            ->filter()
            ->values();

        $cityIndex = $parts->search(fn (string $part) => $this->cities->resolve($part) !== null);

        if ($cityIndex === false || $cityIndex === 0) {
            return null;
        }

        // Walk back from the city past anything that is not a place — a plus code, a house
        // number, "Block W" — and stop before it becomes a guess.
        for ($i = $cityIndex - 1; $i >= max(0, $cityIndex - 3); $i--) {
            $candidate = $parts[$i];

            if (str_contains($candidate, '+') || preg_match('/^\d+$/', $candidate)) {
                continue;
            }

            // Google leads with the establishment when it has a name — "Some Society, Block
            // W, Delhi" — and that is the building, not the neighbourhood around it. It
            // cannot be an index rule: a short address like "Sector 1, Greater Noida" opens
            // with the locality itself.
            if (SocietyImportCandidate::normalise($candidate) === SocietyImportCandidate::normalise($placeName)) {
                continue;
            }

            if ($this->names->rejectionReason($candidate) === null) {
                return $this->names->canonicalise($candidate);
            }
        }

        return null;
    }
}
