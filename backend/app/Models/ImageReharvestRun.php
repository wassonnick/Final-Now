<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class ImageReharvestRun extends Model
{
    protected $fillable = ['scope', 'queued', 'screen_images', 'republish_cover'];

    protected $casts = [
        'results' => 'array',
        'screen_images' => 'boolean',
        'republish_cover' => 'boolean',
        'finished_at' => 'datetime',
    ];

    /** Enough to diagnose a run without letting a 300-society batch bloat the row. */
    private const KEEP_RESULTS = 60;

    /**
     * Fold one society's outcome into the run.
     *
     * Jobs finish concurrently, so the counters are incremented inside a row lock —
     * a read-modify-write here would silently lose results under a multi-worker queue.
     *
     * @param  array<string,mixed>  $result
     */
    public function recordResult(array $result): void
    {
        DB::transaction(function () use ($result) {
            /** @var self $run */
            $run = self::whereKey($this->getKey())->lockForUpdate()->first();
            if (! $run) {
                return;
            }

            $status = (string) ($result['status'] ?? 'failed');

            $run->completed++;
            $run->refreshed += $status === 'refreshed' ? 1 : 0;
            $run->republished += ! empty($result['republished']) ? 1 : 0;
            $run->rejected_images += (int) ($result['rejected'] ?? 0);
            $run->no_candidates += in_array($status, ['no_candidates', 'all_rejected'], true) ? 1 : 0;
            $run->failed += $status === 'failed' ? 1 : 0;

            $results = (array) ($run->results ?? []);
            array_unshift($results, [
                'society_id' => $result['society_id'] ?? null,
                'name' => $result['name'] ?? '',
                'status' => $status,
                'note' => $result['note'] ?? '',
                'before' => $result['before'] ?? 0,
                'after' => $result['after'] ?? 0,
                'rejected' => $result['rejected'] ?? 0,
                'republished' => (bool) ($result['republished'] ?? false),
                'at' => now()->toIso8601String(),
            ]);
            $run->results = array_slice($results, 0, self::KEEP_RESULTS);

            if ($run->completed >= $run->queued) {
                $run->finished_at = now();
            }

            $run->save();
        });
    }

    public function isFinished(): bool
    {
        return $this->finished_at !== null || $this->completed >= $this->queued;
    }
}
