<?php

namespace App\Jobs;

use App\Models\ImageReharvestRun;
use App\Models\Society;
use App\Services\Society\Import\SocietyImageReharvestService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

/**
 * One society per job, so a bulk re-harvest of the whole catalogue is interruptible
 * and a single unreachable official site cannot take the batch down with it.
 */
class ReharvestSocietyImages implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 1;

    public int $timeout = 300;

    public function __construct(
        public readonly int $societyId,
        public readonly ?int $runId = null,
        public readonly bool $screenImages = true,
        public readonly bool $republishCover = true,
    ) {
    }

    public function handle(SocietyImageReharvestService $reharvest): void
    {
        $society = Society::find($this->societyId);
        $run = $this->runId ? ImageReharvestRun::find($this->runId) : null;

        if (! $society) {
            $run?->recordResult(['society_id' => $this->societyId, 'name' => '', 'status' => 'failed', 'note' => 'Society no longer exists.']);

            return;
        }

        try {
            $result = $reharvest->reharvest($society, $this->screenImages, $this->republishCover);
        } catch (\Throwable $e) {
            Log::warning('Image re-harvest job failed', ['society' => $this->societyId, 'error' => $e->getMessage()]);
            $result = [
                'society_id' => $society->id,
                'name' => (string) $society->name,
                'status' => 'failed',
                'note' => $e->getMessage(),
            ];
        }

        $run?->recordResult($result);
    }

    public function failed(\Throwable $e): void
    {
        // A job killed by the worker (timeout, memory) never reaches handle()'s catch,
        // and without this the run would sit at "in progress" for ever.
        if ($this->runId) {
            ImageReharvestRun::find($this->runId)?->recordResult([
                'society_id' => $this->societyId,
                'name' => '',
                'status' => 'failed',
                'note' => 'Worker aborted the job: '.$e->getMessage(),
            ]);
        }
    }
}
