<?php

namespace App\Services\Ops;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

/**
 * The scheduler stamps this heartbeat every tick. When it goes stale, every scheduled
 * automation (SEO cycle, social autopilot, market refresh, queue processing) is silently
 * stalled — dashboards read this to warn loudly instead of letting the stall hide.
 */
class SchedulerHeartbeat
{
    public const CACHE_KEY = 'ops:scheduler-heartbeat';

    /** @return array{healthy:bool,last_heartbeat_at:?string,minutes_since:?int} */
    public static function status(): array
    {
        $stamp = Cache::get(self::CACHE_KEY);
        $last = $stamp ? Carbon::parse($stamp) : null;
        $minutes = $last ? (int) abs($last->diffInMinutes(now())) : null;

        return [
            'healthy' => $last !== null && $minutes <= 10,
            'last_heartbeat_at' => $last?->toIso8601String(),
            'minutes_since' => $minutes,
        ];
    }
}
