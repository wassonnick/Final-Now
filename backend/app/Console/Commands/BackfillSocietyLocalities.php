<?php

namespace App\Console\Commands;

use App\Models\Locality;
use App\Models\Society;
use App\Services\Ncr\LocalityNameService;
use Illuminate\Console\Command;

/**
 * Creates the locality rows that societies imported before the importer did it themselves
 * never got.
 *
 * Locality creation was missing from the import path entirely — not gated, not deferred,
 * simply absent — so every society before that fix carries a locality NAME with no row
 * behind it. City launch readiness counts published localities, which is why a city could
 * never reach the depth its own rule demanded.
 *
 * Reports by default and writes only with --apply, because it creates rows in a live
 * catalogue and the preview is the whole point.
 */
class BackfillSocietyLocalities extends Command
{
    protected $signature = 'societies:backfill-localities {--apply : Create the missing localities} {--city= : Restrict to one city name}';

    protected $description = 'Create and link locality rows for societies imported before the importer created them.';

    public function handle(LocalityNameService $names): int
    {
        $apply = (bool) $this->option('apply');

        $societies = Society::query()
            ->whereNull('locality_id')
            ->when($this->option('city'), fn ($q, $city) => $q->where('city', $city))
            ->get(['id', 'name', 'locality', 'sector', 'city', 'city_id', 'state']);

        // Group by the locality that would be created, so the preview reads as the set of
        // rows to be added rather than a list of societies.
        $planned = [];
        $skipped = 0;

        foreach ($societies as $society) {
            $raw = trim((string) ($society->locality ?: $society->sector));

            // Same rules the importer now applies, so a re-run cannot recreate the ad copy
            // and addresses that the normalise pass has just cleared out.
            if ($raw === '' || $names->rejectionReason($raw, (string) $society->city) !== null) {
                $skipped++;

                continue;
            }

            $name = $names->canonicalise($raw);
            $slug = $names->slugFor($raw);
            $planned[$slug] ??= [
                'name' => $name,
                'slug' => $slug,
                'city' => $society->city ?: 'Gurgaon',
                'city_id' => $society->city_id,
                'state' => $society->state ?: 'Haryana',
                'societies' => 0,
                'exists' => Locality::where('slug', $slug)->exists(),
            ];
            $planned[$slug]['societies']++;
        }

        if ($planned === []) {
            $this->info('Every society with a locality name already has a locality row.');

            return self::SUCCESS;
        }

        $this->table(
            ['Locality', 'City', 'Societies', 'Already exists'],
            collect($planned)->map(fn ($row) => [
                $row['name'], $row['city'], $row['societies'], $row['exists'] ? 'yes — will link only' : 'no — will create',
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

        foreach ($planned as $slug => $row) {
            $locality = Locality::firstOrCreate(
                ['slug' => $slug],
                [
                    'name' => $row['name'],
                    'city_id' => $row['city_id'],
                    'city' => $row['city'],
                    'state' => $row['state'],
                    // Same rule the importer uses: published, because a locality page is
                    // only reachable once its city is launched, so this opens nothing.
                    'published_status' => config('features.locality_auto_publish', true) ? 'published' : 'draft',
                ],
            );

            if ($locality->wasRecentlyCreated) {
                $created++;
            }

            // Matched through the same canonicaliser rather than a LOWER() comparison,
            // because the society still stores the raw text: "sec-36" has to find its way
            // to Sector 36 here exactly as it would during an import.
            $ids = Society::whereNull('locality_id')
                ->when($this->option('city'), fn ($q, $city) => $q->where('city', $city))
                ->get(['id', 'locality', 'sector'])
                ->filter(fn ($s) => $names->slugFor((string) ($s->locality ?: $s->sector)) === $slug)
                ->pluck('id');

            $linked += $ids->isEmpty() ? 0 : Society::whereIn('id', $ids)->update(['locality_id' => $locality->id]);
        }

        $this->info("Created {$created} locality(ies) and linked {$linked} society(ies).");

        return self::SUCCESS;
    }
}
