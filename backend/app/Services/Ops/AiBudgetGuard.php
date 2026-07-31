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
    /**
     * Cost-weighted units — a web-search call costs ~30× a Haiku text call, so counting
     * "calls" made the cap meaningless. Callers record the unit class that matches what
     * they actually spend; the daily cap is denominated in these units.
     */
    public const UNIT_TEXT = 1;      // plain text generation (Haiku/Gemini Flash)
    public const UNIT_IMAGE = 3;     // one generated image (gpt-image)
    public const UNIT_SEARCH = 5;    // web-search grounded call (market refresh)

    /**
     * Who is spending.
     *
     * Unattended jobs and a person waiting for a chat reply were sharing one daily pool,
     * and the jobs run first — the SEO autopilot at 02:00, market refresh at 05:30, social
     * at 08:30. By the time anyone opens the advisor the pool could already be empty, and
     * the assistant would answer "resting for a moment to stay within today's limits" for
     * the rest of the day. Background work now stops short of the cap so there is always
     * something left for a human.
     */
    public const LANE_INTERACTIVE = 'interactive';

    public const LANE_BACKGROUND = 'background';

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

    /**
     * A 12-hour breaker is right for a nightly batch and far too blunt for a person
     * typing a question: one 429 on an automated job at 2am would otherwise leave the
     * advisor dead until lunchtime. Background work stays backed off for the full
     * window; the interactive lane only honours a recent trip, so it self-heals.
     */
    public function providerLimited(string $lane = self::LANE_BACKGROUND): bool
    {
        $trippedAt = Cache::get($this->limitKey());
        if (! $trippedAt) {
            return false;
        }

        if ($lane !== self::LANE_INTERACTIVE) {
            return true;
        }

        $minutes = max(1, (int) config('services.ops.ai_interactive_limit_minutes', 15));

        try {
            return \Illuminate\Support\Carbon::parse((string) $trippedAt)->gt(now()->subMinutes($minutes));
        } catch (\Throwable) {
            return true;
        }
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

    /** Units held back from automation so a person always has some left. */
    public function reserve(): int
    {
        return max(0, min((int) config('services.ops.ai_interactive_reserve', 40), $this->cap()));
    }

    public function remaining(string $lane = self::LANE_BACKGROUND): int
    {
        $ceiling = $lane === self::LANE_INTERACTIVE ? $this->cap() : $this->cap() - $this->reserve();

        return max(0, $ceiling - $this->used());
    }

    public function allow(string $lane = self::LANE_BACKGROUND): bool
    {
        return $this->remaining($lane) > 0;
    }

    public function record(int $calls = 1): void
    {
        Cache::add($this->key(), 0, now()->addDays(2));
        Cache::increment($this->key(), max(1, $calls));
    }
}
