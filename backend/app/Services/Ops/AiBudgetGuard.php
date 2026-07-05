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

    private function limitKey(): string
    {
        return 'ops:ai-provider-limit';
    }

    /**
     * Classify an enrichment result as a provider usage/credit/billing limit (as opposed to
     * a transient error), from either the explicit quota flag or the error message text.
     *
     * @param  array<string,mixed>  $result
     */
    public static function isProviderLimit(array $result): bool
    {
        if (! empty($result['_ai_quota_limited'])) {
            return true;
        }

        $status = (int) ($result['_ai_error_status'] ?? 0);
        if (in_array($status, [402, 429], true)) {
            return true;
        }

        $message = strtolower((string) ($result['_ai_error'] ?? ''));
        if ($message === '') {
            return false;
        }

        foreach (['usage limit', 'credit balance', 'insufficient', 'billing', 'quota', 'http 429', 'http 402'] as $needle) {
            if (str_contains($message, $needle)) {
                return true;
            }
        }

        return false;
    }

    /** Trip the circuit-breaker so subsequent automated refreshes short-circuit for a while. */
    public function tripProviderLimit(int $minutes = 720): void
    {
        Cache::put($this->limitKey(), now()->toIso8601String(), now()->addMinutes(max(1, $minutes)));
    }

    public function providerLimited(): bool
    {
        return Cache::has($this->limitKey());
    }

    public function clearProviderLimit(): void
    {
        Cache::forget($this->limitKey());
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
