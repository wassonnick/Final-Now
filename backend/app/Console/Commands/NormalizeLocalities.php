<?php

namespace App\Console\Commands;

use App\Models\City;
use App\Models\Locality;
use App\Models\Society;
use App\Services\Ncr\LocalityNameService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * Tidies the locality rows the importer accumulated before it knew what a locality was.
 *
 * Three distinct problems, deliberately fixed by one pass because they interact: merging
 * "sec-36" into "Sector 36" changes which row a demotion applies to, and correcting a
 * city changes which launch gate a locality sits behind.
 *
 * Reports by default. `--apply` does the spelling and demotion work, which stays inside
 * the locality table. `--fix-cities` additionally moves societies between cities, which is
 * a larger claim about the data, so it is a separate decision.
 */
class NormalizeLocalities extends Command
{
    protected $signature = 'societies:normalize-localities
        {--apply : Merge duplicates, fix spelling, and demote non-localities}
        {--fix-cities : Also move known-misfiled localities and their societies to the right city}';

    protected $description = 'Merge duplicate localities, canonicalise names, and demote entries that are not places.';

    public function handle(LocalityNameService $names): int
    {
        $apply = (bool) $this->option('apply');
        $fixCities = (bool) $this->option('fix-cities');
        $corrections = config('locality_corrections', []);

        $rows = [];
        $plan = [];

        foreach (Locality::query()->orderBy('name')->get() as $locality) {
            $canonical = $names->canonicalise((string) $locality->name);
            $slug = $names->slugFor((string) $locality->name);
            $reason = $names->rejectionReason((string) $locality->name, (string) $locality->city);
            $societies = Society::where('locality_id', $locality->id)->count();

            $actions = [];

            // Merge first: everything else applies to whichever row survives. Scoped to the
            // same city, because Noida's "sec-36" must become Noida's Sector 36 and never
            // be absorbed into Gurugram's.
            $winner = $slug !== $locality->slug
                ? Locality::where('slug', $slug)
                    ->where('id', '!=', $locality->id)
                    ->where(fn ($q) => $locality->city_id
                        ? $q->where('city_id', $locality->city_id)
                        : $q->where('city', $locality->city))
                    ->first()
                : null;

            if ($winner) {
                $actions[] = 'merge into "'.$winner->name.'"';
            } elseif ($canonical !== $locality->name || $slug !== $locality->slug) {
                $actions[] = 'rename to "'.$canonical.'"';
            }

            if ($reason !== null && $locality->published_status === 'published') {
                $actions[] = 'unpublish — '.$reason;
            }

            $correction = $corrections[$slug] ?? $corrections[$locality->slug] ?? null;
            if ($correction && (string) $locality->city !== $correction['city']) {
                $actions[] = ($fixCities ? 'move' : 'would move').' to '.$correction['city'].' with '.$societies.' society(ies)';
            }

            if ($actions === []) {
                continue;
            }

            $rows[] = [$locality->name, $locality->city, $societies, implode('; ', $actions)];
            $plan[] = compact('locality', 'canonical', 'slug', 'reason', 'winner', 'correction');
        }

        if ($plan === []) {
            $this->info('Every locality name is already canonical, unique, and a real place.');

            return self::SUCCESS;
        }

        $this->table(['Locality', 'City', 'Societies', 'Action'], $rows);

        if (! $apply) {
            $this->line('');
            $this->line('Nothing was written. Re-run with --apply'.($fixCities ? ' --fix-cities' : '').' to make these changes.');

            if (! $fixCities) {
                $this->line('Add --fix-cities to also move the misfiled localities and their societies.');
            }

            return self::SUCCESS;
        }

        $merged = $moved = $renamed = $unpublished = 0;

        DB::transaction(function () use ($plan, $fixCities, &$merged, &$moved, &$renamed, &$unpublished) {
            foreach ($plan as $step) {
                /** @var Locality $locality */
                $locality = $step['locality'];

                if ($step['winner']) {
                    Society::where('locality_id', $locality->id)->update(['locality_id' => $step['winner']->id]);

                    // Deleted only when it is an empty shell. A merged-away row that someone
                    // wrote a description or SEO title for holds work that would vanish
                    // silently, so it is unpublished and left for a person to look at.
                    if ($this->isEmptyShell($locality)) {
                        $locality->delete();
                    } else {
                        $locality->update(['published_status' => 'draft']);
                    }

                    $merged++;

                    continue;
                }

                if ($step['canonical'] !== $locality->name || $step['slug'] !== $locality->slug) {
                    $locality->update(['name' => $step['canonical'], 'slug' => $step['slug']]);
                    $renamed++;
                }

                if ($step['reason'] !== null && $locality->published_status === 'published') {
                    // Demoted rather than deleted: societies still point at it, and the name
                    // remains useful for grouping in admin even when it must not be a page.
                    $locality->update(['published_status' => 'draft']);
                    $unpublished++;
                }

                if ($fixCities && $step['correction']) {
                    $city = City::where('name', $step['correction']['city'])->first();

                    $locality->update([
                        'city' => $step['correction']['city'],
                        'state' => $step['correction']['state'],
                        'city_id' => $city?->id ?? $locality->city_id,
                    ]);

                    Society::where('locality_id', $locality->id)->update([
                        'city' => $step['correction']['city'],
                        'state' => $step['correction']['state'],
                        'city_id' => $city?->id,
                    ]);

                    $moved++;
                }
            }
        });

        $this->info("Merged {$merged}, renamed {$renamed}, unpublished {$unpublished}, moved city for {$moved}.");

        if (! $fixCities) {
            $this->line('City corrections were listed but not applied. Re-run with --fix-cities when you want them.');
        }

        return self::SUCCESS;
    }

    /** Does this row hold anything a person wrote? */
    private function isEmptyShell(Locality $locality): bool
    {
        foreach (['description', 'seo_title', 'seo_description', 'connectivity_score', 'safety_score', 'lifestyle_score'] as $field) {
            if (filled($locality->{$field})) {
                return false;
            }
        }

        return true;
    }
}
