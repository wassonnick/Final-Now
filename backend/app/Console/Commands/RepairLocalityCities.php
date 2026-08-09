<?php

namespace App\Console\Commands;

use App\Models\Locality;
use App\Models\Society;
use App\Services\Ncr\LocalityResolver;
use Illuminate\Console\Command;

/**
 * Repoints societies that were filed under another city's locality of the same name.
 *
 * Sector numbering restarts in every NCR city, and every writer of locality links keyed on
 * the slug alone, so the first city to claim "sector-44" collected every later city's
 * Sector 44 societies too. Eight Noida societies were sitting on a Gurugram sector page.
 *
 * Two things were wrong at once and both matter: the Noida societies were invisible on
 * their own city's pages, and Gurugram's Sector 44 page was listing inventory that is an
 * hour's drive away — a correctness problem for anyone reading it, not only a counting
 * problem for the launch gate.
 */
class RepairLocalityCities extends Command
{
    protected $signature = 'societies:repair-locality-cities {--apply : Repoint the mismatched societies}';

    protected $description = 'Move societies linked to a same-named locality in the wrong city onto their own city\'s locality.';

    public function handle(LocalityResolver $resolver): int
    {
        $apply = (bool) $this->option('apply');

        $localities = Locality::query()->get()->keyBy('id');
        $rows = [];
        $mismatched = [];

        foreach (Society::query()->whereNotNull('locality_id')->get(['id', 'name', 'locality', 'locality_id', 'sector', 'city', 'city_id', 'state']) as $society) {
            $locality = $localities->get($society->locality_id);

            if (! $locality || ! $this->citiesDiffer((string) $society->city, (string) $locality->city)) {
                continue;
            }

            $rows[] = [$society->name, $society->city ?: '—', $locality->name.' ('.$locality->city.')'];
            $mismatched[] = $society;
        }

        if ($mismatched === []) {
            $this->info('Every society sits on a locality in its own city.');

            return self::SUCCESS;
        }

        $this->table(['Society', 'Society city', 'Currently linked to'], $rows);

        if (! $apply) {
            $this->line('');
            $this->line('Nothing was written. Re-run with --apply to move these onto their own city\'s locality.');

            return self::SUCCESS;
        }

        $moved = 0;
        $unresolved = 0;

        foreach ($mismatched as $society) {
            $locality = $resolver->resolve(
                (string) ($society->locality ?: $society->sector),
                ['city_id' => $society->city_id, 'city' => $society->city, 'state' => $society->state],
            );

            if (! $locality || $locality->id === $society->locality_id) {
                $unresolved++;

                continue;
            }

            Society::where('id', $society->id)->update(['locality_id' => $locality->id]);
            $moved++;
        }

        $this->info("Moved {$moved} society(ies) onto a locality in their own city.");

        if ($unresolved > 0) {
            $this->warn($unresolved.' could not be resolved — the locality text is blank or not a place. Fix those on the society itself.');
        }

        return self::SUCCESS;
    }

    /** Gurgaon and Gurugram are the same city; a blank on either side is not a mismatch. */
    private function citiesDiffer(string $societyCity, string $localityCity): bool
    {
        $normalise = fn (string $v) => str_replace('gurugram', 'gurgaon', strtolower(trim($v)));

        $a = $normalise($societyCity);
        $b = $normalise($localityCity);

        return $a !== '' && $b !== '' && $a !== $b;
    }
}
