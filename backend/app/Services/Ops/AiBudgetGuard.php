<?php

namespace App\Services\Ops;

use Illuminate\Support\Facades\Cache;

/**
 * Daily cap on automated AI calls so a scheduled batch can never burn
 * through the whole provider budget (or keep hammering a billing outage).
 * Admin-initiated actions are not gated — this only protects unattended jobs.
 */
class AiBudgetGuard
{
    private function key(): string
    {
        return 'ops:ai-budget:'.now()->toDateString();
    }

    public function cap(): int
    {
        return max(0, (int) config('services.ops.ai_daily_call_cap', 150));
    }

    public function used(): int
    {
        return (int) Cache::get($this->key(), 0);
    }

    public function remaining(): int
    {
        return max(0, $this->cap() - $this->used());
    }

    public function allow(): bool
    {
        return $this->remaining() > 0;
    }

    public function record(int $calls = 1): void
    {
        Cache::add($this->key(), 0, now()->addDays(2));
        Cache::increment($this->key(), max(1, $calls));
    }
}
