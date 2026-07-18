<?php

namespace App\Jobs;

use App\Models\Society;
use App\Services\Ops\AiBudgetGuard;
use App\Services\Ops\MarketSuggestionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class RefreshSocietyMarketSuggestion implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 150;

    public function __construct(public readonly int $societyId)
    {
    }

    public function handle(MarketSuggestionService $market, AiBudgetGuard $budget): void
    {
        $society = Society::find($this->societyId);

        if (! $society || ! $society->is_published) {
            return;
        }

        if (! $budget->allow()) {
            // Budget exhausted for today; the weekly scheduler will pick this
            // society up again on the next run rather than retrying blind.
            return;
        }

        $budget->record(\App\Services\Ops\AiBudgetGuard::UNIT_SEARCH);
        $market->fetchForSociety($society);
    }
}
