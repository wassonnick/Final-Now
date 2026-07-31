<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MarketRefreshLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * What the most expensive automation actually did. Market refresh is a grounded
 * web-search call per society and the bulk of the AI bill, so the question worth
 * answering is not "did it run" but "did anything change, and on whose authority".
 */
class AdminMarketRefreshController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        $days = max(1, min((int) $request->integer('days', 30), 90));
        $limit = max(1, min((int) $request->integer('limit', 100), 300));
        $since = now()->subDays($days)->startOfDay();

        $window = MarketRefreshLog::query()->where('created_at', '>=', $since);

        $total = (clone $window)->count();
        $societies = (clone $window)->distinct('society_id')->count('society_id');
        // A refresh that changed nothing still cost a web-search call — worth seeing.
        $withChanges = (clone $window)->get(['changed_fields'])
            ->filter(fn ($row) => is_array($row->changed_fields) && $row->changed_fields !== [])
            ->count();

        $fieldCounts = [];
        foreach ((clone $window)->get(['changed_fields']) as $row) {
            foreach ((array) $row->changed_fields as $field) {
                $fieldCounts[$field] = ($fieldCounts[$field] ?? 0) + 1;
            }
        }
        arsort($fieldCounts);

        $rows = (clone $window)->with('society:id,name,slug,sector')
            ->latest('created_at')->limit($limit)->get();

        return response()->json([
            'status' => 'ok',
            'data' => [
                'summary' => [
                    'window_days' => $days,
                    'refreshes' => $total,
                    'societies_touched' => $societies,
                    'refreshes_with_changes' => $withChanges,
                    'refreshes_unchanged' => max(0, $total - $withChanges),
                    'change_rate' => $total > 0 ? round($withChanges / $total * 100, 1) : 0.0,
                    // The whole point of the page: what the unchanged runs cost.
                    'estimated_units_spent' => $total * 5,
                ],
                'fields_changed' => collect($fieldCounts)->map(fn ($count, $field) => ['field' => $field, 'count' => $count])->values(),
                'refreshes' => $rows->map(fn (MarketRefreshLog $log) => [
                    'id' => $log->id,
                    'society_id' => $log->society_id,
                    'society_name' => $log->society?->name,
                    'society_slug' => $log->society?->slug,
                    'sector' => $log->society?->sector,
                    'trigger' => $log->trigger,
                    'before' => $log->before,
                    'after' => $log->after,
                    'changed_fields' => $log->changed_fields ?: [],
                    'sources' => $log->sources ?: [],
                    'confidence' => $log->confidence,
                    'notes' => $log->notes,
                    'created_at' => $log->created_at?->toIso8601String(),
                ])->values(),
            ],
        ]);
    }
}
