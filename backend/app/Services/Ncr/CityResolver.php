<?php

namespace App\Services\Ncr;

use App\Models\City;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * Turns the city a society calls itself into the city row the catalogue counts.
 *
 * Every count that matters — launch readiness, the admin filter, locality depth — joins on
 * city_id. Nothing on the import path ever set it, so a society arrived carrying the text
 * "Delhi" and belonging to no city at all: the public site, which matches on the text,
 * showed fifty-eight, while admin showed twelve.
 *
 * Names are matched with their real-world spellings. Google writes Gurugram and New Delhi;
 * the catalogue holds Gurgaon and Delhi; both have to land in the same place.
 */
class CityResolver
{
    /** @var Collection<int,City>|null */
    private ?Collection $cities = null;

    public function resolve(?string $cityText): ?City
    {
        $slug = Str::slug((string) $cityText);

        if ($slug === '') {
            return null;
        }

        foreach ($this->cities() as $city) {
            foreach ($this->aliases($city) as $alias) {
                if ($slug === Str::slug($alias)) {
                    return $city;
                }
            }
        }

        return null;
    }

    /**
     * The city named inside a formatted address.
     *
     * Longest name first, so "Greater Noida" is never read as "Noida" — the substring match
     * that makes this convenient is also the one that would quietly get it wrong.
     */
    public function fromAddress(?string $address): ?City
    {
        $haystack = mb_strtolower(trim((string) $address));

        if ($haystack === '') {
            return null;
        }

        foreach ($this->cities() as $city) {
            foreach ($this->aliases($city) as $alias) {
                if (str_contains($haystack, mb_strtolower($alias))) {
                    return $city;
                }
            }
        }

        return null;
    }

    /** @return array<int,string> */
    private function aliases(City $city): array
    {
        $name = (string) $city->name;

        return match (mb_strtolower($name)) {
            'gurgaon', 'gurugram' => ['Gurugram', 'Gurgaon'],
            'delhi' => ['New Delhi', 'Delhi'],
            default => [$name, (string) $city->slug],
        };
    }

    /** @return Collection<int,City> */
    private function cities(): Collection
    {
        return $this->cities ??= City::query()
            ->get(['id', 'name', 'slug', 'region_id'])
            ->sortByDesc(fn (City $city) => mb_strlen((string) $city->name))
            ->values();
    }
}
