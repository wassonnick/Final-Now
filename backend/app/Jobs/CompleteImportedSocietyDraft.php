<?php

namespace App\Jobs;

use App\Models\Society;
use App\Services\Ops\AiBudgetGuard;
use App\Services\Society\Import\SocietyDraftCompletionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * Runs after every one-click import: takes the freshly created draft through the
 * completion pipeline (data gaps, cover approval, SEO generation + publish, society
 * publish when all gates pass) so an import is genuinely done in one click.
 */
class CompleteImportedSocietyDraft implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 240;

    public function __construct(public readonly int $societyId)
    {
    }

    public function handle(SocietyDraftCompletionService $completion, AiBudgetGuard $budget): void
    {
        $society = Society::find($this->societyId);

        if (! $society || $society->is_published) {
            return;
        }
        if ($budget->providerLimited()) {
            return;
        }

        $completion->complete($society);
    }
}
