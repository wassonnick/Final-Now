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

/**
 * Fully-automatic market refresh for a published society: fetches grounded rent/sale
 * data and applies it directly (no admin review), so public society pages stay current
 * with the market. Only the market fields + provenance are touched. Budget-guarded.
 */
class AutoRefreshSocietyMarket implements ShouldQueue
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
            return;
        }

        $budget->record();
        $market->refreshAndApply($society);
    }
}
