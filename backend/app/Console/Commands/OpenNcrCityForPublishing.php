<?php

namespace App\Console\Commands;

use App\Models\City;
use App\Models\NcrCityLaunchApproval;
use App\Models\Society;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

/**
 * Opens an NCR city for publishing — societies in it may go live and its city page stops
 * saying "launching" — WITHOUT approving it for indexing or the sitemap.
 *
 * That separation is the point. Indexing needs five published societies and three
 * localities, and a city cannot reach five published societies while publishing is the
 * thing it is waiting on. Opening a city is reversible and invisible to Google; approving
 * it for indexing is neither, and keeps its own bar.
 */
class OpenNcrCityForPublishing extends Command
{
    protected $signature = 'ncr:open-city {slug} {--close : Close the city again} {--notes= : Why this was opened}';

    protected $description = 'Open an NCR city for publishing (city page live, still noindex until it earns indexing).';

    public function handle(): int
    {
        $slug = Str::slug((string) $this->argument('slug'));
        $city = City::where('slug', $slug)->first();

        if (! $city) {
            $this->error("No city with slug '{$slug}'.");

            return self::FAILURE;
        }

        if ($this->option('close')) {
            NcrCityLaunchApproval::where('city_slug', $slug)
                ->update(['approved_for_publishing' => false, 'publishing_approved_at' => null]);
            $this->info($city->name.' is closed for publishing again. Societies in it will not be publishable.');

            return self::SUCCESS;
        }

        $approval = NcrCityLaunchApproval::updateOrCreate(
            ['city_slug' => $slug],
            [
                'city_id' => $city->id,
                'approved_for_publishing' => true,
                'publishing_approved_at' => now(),
                'revoked_at' => null,
                'approval_notes' => $this->option('notes') ?: 'Opened for publishing via ncr:open-city.',
            ] + (NcrCityLaunchApproval::where('city_slug', $slug)->exists() ? [] : ['status' => 'open_for_publishing']),
        );

        $published = Society::where('city_id', $city->id)->where('is_published', true)->count();
        $draft = Society::where('city_id', $city->id)->where('is_published', false)->count();

        $this->info($city->name.' is open for publishing.');
        $this->line("  Published societies: {$published}");
        $this->line("  Drafts waiting:      {$draft}");
        $this->line('');
        $this->warn('Still NOT approved for indexing or the sitemap — that keeps its own bar of 5 published societies and 3 localities.');
        $this->line('Publish the drafts from the admin society list, or let the nightly draft completion do it.');

        return $approval->exists ? self::SUCCESS : self::FAILURE;
    }
}
