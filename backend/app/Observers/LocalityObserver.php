<?php

namespace App\Observers;

use App\Models\Locality;
use App\Services\Ncr\CityResolver;

/**
 * Keeps a locality attached to its city row.
 *
 * Localities were created during import from the society's context, and before societies
 * carried a city_id that context had only a name — so the rows were written with
 * city = "Delhi" and city_id = null. Launch readiness and the admin filter both count by
 * city_id, so those localities existed and counted for nothing.
 *
 * Societies repaired themselves because the automation saves them constantly. Nothing ever
 * re-saves a locality, so they stayed broken until something made them a first-class row
 * rather than a by-product of whichever society happened to create them.
 */
class LocalityObserver
{
    public function saving(Locality $locality): void
    {
        if ($locality->isDirty('city_id') && filled($locality->city_id)) {
            return;
        }

        if (filled($locality->city_id) && ! $locality->isDirty('city')) {
            return;
        }

        if (blank($locality->city)) {
            return;
        }

        $city = app(CityResolver::class)->resolve((string) $locality->city);

        if (! $city) {
            return;
        }

        $locality->city_id = $city->id;
        // Google writes "New Delhi"; the catalogue holds "Delhi". Store the catalogue's.
        $locality->city = $city->name;

        if (blank($locality->region_id)) {
            $locality->region_id = $city->region_id;
        }
    }
}
