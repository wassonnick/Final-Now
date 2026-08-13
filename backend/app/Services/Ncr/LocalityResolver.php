<?php

namespace App\Services\Ncr;

use App\Models\City;
use App\Models\Locality;

/**
 * Finds or creates the locality a society belongs to, within that society's own city.
 *
 * The city half is the whole point. Sector numbering restarts in every NCR city — there is
 * a Sector 44 in Gurugram, in Noida, in Faridabad — so a lookup keyed on the slug alone
 * hands the second city the first city's locality. That is not a rare collision to guard
 * against; across NCR it is the common case, and it silently files a Noida society under a
 * Gurugram sector page.
 *
 * The zones table got this right from the start with unique(city_id, slug). Localities
 * did not, and every writer since has keyed on slug alone.
 */
class LocalityResolver
{
    public function __construct(private LocalityNameService $names) {}

    /**
     * @param  array{city_id?:int|null, city?:string|null, state?:string|null}  $context
     */
    public function resolve(string $rawName, array $context): ?Locality
    {
        if (trim($rawName) === '' || $this->names->rejectionReason($rawName, $context['city'] ?? null) !== null) {
            return null;
        }

        $slug = $this->names->slugFor($rawName);
        $correction = config('locality_corrections')[$slug] ?? null;

        $city = $correction['city'] ?? $context['city'] ?? 'Gurgaon';
        $state = $correction['state'] ?? $context['state'] ?? 'Haryana';
        $cityId = $correction ? (City::where('name', $city)->value('id') ?? $context['city_id'] ?? null) : ($context['city_id'] ?? null);

        // Scoped by city_id when we have one. A null city_id cannot be scoped, so it falls
        // back to matching on the city NAME rather than collapsing every unlinked city into
        // one bucket — imperfect, but it keeps Noida out of Gurugram.
        $inCity = Locality::query()
            ->when($cityId, fn ($q) => $q->where('city_id', $cityId))
            ->when(! $cityId, fn ($q) => $q->where('city', $city))
            ->get();

        $existing = $inCity->firstWhere('slug', $slug);

        // Then the forgiving comparison, so "Janak Puri" finds "Janakpuri" and "Pitampura
        // Delhi" finds "Pitampura" instead of founding a rival row for the same place.
        if (! $existing) {
            $key = $this->names->matchKey($rawName);
            $existing = $key === '' ? null : $inCity->first(fn (Locality $row) => $this->names->matchKey((string) $row->name) === $key);
        }

        if ($existing) {
            return $existing;
        }

        return Locality::create([
            'name' => $this->names->canonicalise($rawName),
            'slug' => $slug,
            'city_id' => $cityId,
            'city' => $city,
            'state' => $state,
            'published_status' => config('features.locality_auto_publish', true) ? 'published' : 'draft',
        ]);
    }
}
