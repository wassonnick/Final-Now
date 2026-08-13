<?php

namespace App\Observers;

use App\Models\Society;
use App\Services\Ncr\CityResolver;
use App\Services\Ncr\LocalityResolver;

/**
 * Keeps every society attached to a locality, whichever door it came in through.
 *
 * Ten places in this codebase create a society: the public controller, the admin
 * controller, the import pipeline, the verified importer, the property controller's
 * on-the-fly creation, and four console commands. Locality linking lived in exactly one of
 * them, so societies arriving through the importer — which is most of them — carried a
 * sector name with no locality row behind it. Thirty-eight Noida societies across a dozen
 * sectors produced two localities.
 *
 * The fix belongs here rather than in each caller. Adding the call ten times leaves the
 * eleventh path to be written without it, which is precisely how this happened: the linking
 * was added to the controller the admin form posts to, and every other route kept its own
 * behaviour.
 */
class SocietyObserver
{
    public function saving(Society $society): void
    {
        // City first: the locality lookup below is scoped by it, and until now the importer
        // set the city TEXT and never the id. Every count that matters joins on city_id, so
        // fifty-eight Delhi societies on the public site were twelve in admin.
        $this->linkCity($society);

        // An explicitly chosen locality is a decision; never second-guess it.
        if ($society->isDirty('locality_id') && filled($society->locality_id)) {
            return;
        }

        $needsLinking = blank($society->locality_id)
            || $society->isDirty('locality')
            || $society->isDirty('sector');

        if (! $needsLinking) {
            return;
        }

        $name = trim((string) ($society->locality ?: $society->sector));

        if ($name === '') {
            return;
        }

        $locality = app(LocalityResolver::class)->resolve($name, [
            'city_id' => $society->city_id,
            'city' => $society->city,
            'state' => $society->state,
        ]);

        // No locality when the text is ad copy or an address. The society keeps the text;
        // it simply does not manufacture a page out of it.
        if ($locality) {
            $society->locality_id = $locality->id;
        }
    }

    private function linkCity(Society $society): void
    {
        // An explicitly chosen city is a decision, exactly as with the locality.
        if ($society->isDirty('city_id') && filled($society->city_id)) {
            return;
        }

        if (! blank($society->city_id) && ! $society->isDirty('city')) {
            return;
        }

        if (blank($society->city)) {
            return;
        }

        $city = app(CityResolver::class)->resolve((string) $society->city);

        if (! $city) {
            return;
        }

        $society->city_id = $city->id;

        // Stored under the catalogue's spelling. Google writes "New Delhi" and the
        // catalogue holds "Delhi", and everything that compares the TEXT — the public
        // city filter, the locality repair's mismatch check — read those as two places.
        // Eight Delhi societies were invisible under the Delhi chip because of it.
        $society->city = $city->name;

        if (blank($society->region_id)) {
            $society->region_id = $city->region_id;
        }
    }
}
