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

        // Daily call cap, plus a circuit-breaker: once the provider signals a credit/usage
        // limit, every remaining job in the sweep short-circuits instead of firing another
        // failing call — so a bulk refresh stops cleanly at the credit line.
        if (! $budget->allow() || $budget->providerLimited()) {
            return;
        }

        $budget->record(\App\Services\Ops\AiBudgetGuard::UNIT_SEARCH);

        try {
            $market->refreshAndApply($society);
        } catch (\App\Exceptions\AiProviderLimitException $e) {
            $budget->tripProviderLimit();
        }
    }
}
