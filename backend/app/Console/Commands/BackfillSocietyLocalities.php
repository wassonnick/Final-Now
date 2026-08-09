<?php

namespace App\Console\Commands;

use App\Models\Locality;
use App\Models\Society;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

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

    public function handle(): int
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
            $name = trim((string) ($society->locality ?: $society->sector));

            if ($name === '') {
                $skipped++;

                continue;
            }

            $slug = Str::slug($name);
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
            $this->warn($skipped.' society(ies) have neither a locality nor a sector and were left alone.');
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

            $linked += Society::whereNull('locality_id')
                ->when($this->option('city'), fn ($q, $city) => $q->where('city', $city))
                ->where(fn ($q) => $q->whereRaw('LOWER(locality) = ?', [strtolower($row['name'])])
                    ->orWhereRaw('LOWER(sector) = ?', [strtolower($row['name'])]))
                ->update(['locality_id' => $locality->id]);
        }

        $this->info("Created {$created} locality(ies) and linked {$linked} society(ies).");

        return self::SUCCESS;
    }
}
