<?php

namespace App\Console\Commands;

use App\Models\Society;
use App\Services\Ncr\NcrCityLaunchPolicy;
use Illuminate\Console\Command;

/**
 * Finds societies that are live on the public site in a city we have not launched.
 *
 * The publish gate now refuses these, but anything published before that gate existed is
 * still out there — a society reachable, listed and in the sitemap while its own city page
 * tells visitors the city is launching.
 */
class AuditPublishedCityLaunch extends Command
{
    protected $signature = 'ncr:audit-published {--unpublish : Return the offending societies to draft}';

    protected $description = 'Report (or unpublish) societies live in an NCR city that has not been launched.';

    public function handle(NcrCityLaunchPolicy $launch): int
    {
        $offenders = Society::query()
            ->with('cityRecord:id,name,slug')
            ->where('is_published', true)
            ->get()
            ->filter(fn (Society $society) => ! $launch->cityMayPublish($society->cityRecord));

        if ($offenders->isEmpty()) {
            $this->info('No published societies sit in an unlaunched city.');

            return self::SUCCESS;
        }

        $this->warn($offenders->count().' published society(ies) are in a city that has not been launched:');
        $this->table(
            ['ID', 'Society', 'City', 'Published at'],
            $offenders->map(fn (Society $s) => [
                $s->id,
                $s->name,
                $s->cityRecord?->name ?? $s->city ?? '—',
                optional($s->published_at)->toDateTimeString() ?? '—',
            ])->all(),
        );

        if (! $this->option('unpublish')) {
            $this->line('');
            $this->line('Re-run with --unpublish to return these to draft, or approve the city in /admin/locations.');

            return self::SUCCESS;
        }

        foreach ($offenders as $society) {
            // Draft, not deleted: the work that went into these rows is still good — the
            // only thing wrong with them is that their city is not open yet.
            $society->update(['is_published' => false, 'status' => 'Draft']);
        }

        $this->info('Returned '.$offenders->count().' society(ies) to draft.');

        return self::SUCCESS;
    }
}
