<?php

namespace App\Console\Commands;

use App\Services\SavedSearchMatcher;
use Illuminate\Console\Command;

class MatchSavedSearches extends Command
{
    protected $signature = 'saved-searches:match {--no-delivery : Create auditable matches without calling the configured delivery webhook}';

    protected $description = 'Match due account alerts against published live properties';

    public function handle(SavedSearchMatcher $matcher): int
    {
        $summary = $matcher->run(! $this->option('no-delivery'));
        $this->table(array_keys($summary), [array_values($summary)]);

        return self::SUCCESS;
    }
}
