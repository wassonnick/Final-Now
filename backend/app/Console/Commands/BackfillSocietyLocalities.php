<?php

namespace App\Console\Commands;

use App\Models\Locality;
use App\Models\Society;
use App\Services\Ncr\LocalityNameService;
use App\Services\Ncr\LocalityResolver;
use Illuminate\Console\Command;

/**
 * Creates the locality rows that societies imported before the importer did it themselves
 * never got.
 *
 * Locality creation was missing from the import path entirely — not gated, not deferred,
 * simply absent — so every society before that fix carries a locality NAME with no row
 * behind it. City launch readiness counts localities, which is why a city could never
 * reach the depth its own rule demanded.
 *
 * Reports by default and writes only with --apply, because it creates rows in a live
 * catalogue and the preview is the whole point.
 */
class BackfillSocietyLocalities extends Command
{
    protected $signature = 'societies:backfill-localities {--apply : Create the missing localities} {--city= : Restrict to one city name}';

    protected $description = 'Create and link locality rows for societies imported before the importer created them.';

    public function handle(LocalityNameService $names, LocalityResolver $resolver): int
    {
        $apply = (bool) $this->option('apply');

        $societies = Society::query()
            ->whereNull('locality_id')
            ->when($this->option('city'), fn ($q, $city) => $q->where('city', $city))
            ->get(['id', 'name', 'locality', 'sector', 'city', 'city_id', 'state']);

        // Grouped by CITY and slug, not slug alone. Sector 44 is a different place in
        // Gurugram and in Noida, and keying on the slug is exactly how eight Noida
        // societies ended up on a Gurugram sector page.
        $planned = [];
        $skipped = 0;

        foreach ($societies as $society) {
            $raw = trim((string) ($society->locality ?: $society->sector));

            // Same rules the importer now applies, so a re-run cannot recreate the ad copy
            // and addresses that the normalise pass clears out.
            if ($raw === '' || $names->rejectionReason($raw, (string) $society->city) !== null) {
                $skipped++;

                continue;
            }

            $slug = $names->slugFor($raw);
            $city = $society->city ?: 'Gurgaon';
            $key = strtolower($city).'|'.$slug;

            $planned[$key] ??= [
                'name' => $names->canonicalise($raw),
                'slug' => $slug,
                'city' => $city,
                'societies' => [],
                'exists' => Locality::where('slug', $slug)
                    ->when($society->city_id, fn ($q) => $q->where('city_id', $society->city_id))
                    ->when(! $society->city_id, fn ($q) => $q->where('city', $city))
                    ->exists(),
            ];
            $planned[$key]['societies'][] = $society;
        }

        if ($planned === []) {
            $this->info('Every society with a usable locality name already has a locality row.');

            return self::SUCCESS;
        }

        $this->table(
            ['Locality', 'City', 'Societies', 'Already exists'],
            collect($planned)->map(fn ($row) => [
                $row['name'], $row['city'], count($row['societies']),
                $row['exists'] ? 'yes — will link only' : 'no — will create',
            ])->all(),
        );

        if ($skipped > 0) {
            $this->warn($skipped.' society(ies) had no usable locality name — blank, an address, or a marketing phrase — and were left alone.');
        }

        if (! $apply) {
            $this->line('');
            $this->line('Nothing was written. Re-run with --apply to create and link these.');

            return self::SUCCESS;
        }

        $created = 0;
        $linked = 0;

        foreach ($planned as $row) {
            foreach ($row['societies'] as $society) {
                $before = Locality::count();

                // Resolved per society rather than once per group, so each one is matched
                // against its own city exactly as an import would match it.
                $locality = $resolver->resolve(
                    (string) ($society->locality ?: $society->sector),
                    ['city_id' => $society->city_id, 'city' => $society->city, 'state' => $society->state],
                );

                if (! $locality) {
                    continue;
                }

                $created += Locality::count() > $before ? 1 : 0;
                $linked += Society::where('id', $society->id)->update(['locality_id' => $locality->id]);
            }
        }

        $this->info("Created {$created} locality(ies) and linked {$linked} society(ies).");

        return self::SUCCESS;
    }
}
