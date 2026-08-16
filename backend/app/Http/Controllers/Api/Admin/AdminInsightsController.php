<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\Demand\DemandGapService;
use App\Services\Seo\SeoCoverageGapService;
use App\Services\Seo\SeoStrikingDistanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The three reports that say what to do next, in the place someone will actually look.
 *
 * Each existed only as an artisan command, which means each existed only for whoever was
 * willing to open a shell on the production container. A weekly report nobody opens is not
 * a report.
 */
class AdminInsightsController extends Controller
{
    public function demandGaps(Request $request, DemandGapService $demand): JsonResponse
    {
        $days = $this->days($request, 60);
        $gaps = $demand->gaps($days, 40);

        return response()->json([
            'status' => 'ok',
            'window_days' => $days,
            'summary' => [
                'gaps' => $gaps->count(),
                'unmet' => $gaps->where('unmet', true)->count(),
                'requests_unmet' => $gaps->where('unmet', true)->sum('requests'),
            ],
            'data' => $gaps,
        ]);
    }

    public function strikingDistance(Request $request, SeoStrikingDistanceService $striking): JsonResponse
    {
        $days = $this->days($request, 28);
        $rows = $striking->opportunities($days, 40);

        return response()->json([
            'status' => 'ok',
            'window_days' => $days,
            'ctr_by_band' => $striking->observedCtrByBand($days),
            'summary' => [
                'opportunities' => $rows->count(),
                'winnable_clicks' => $rows->sum('potential_clicks'),
            ],
            'data' => $rows,
        ]);
    }

    public function coverageGap(Request $request, SeoCoverageGapService $coverage): JsonResponse
    {
        $days = $this->days($request, 28);

        return response()->json([
            'status' => 'ok',
            'window_days' => $days,
            'data' => $coverage->summary($days),
            'actionable' => $coverage->actionable($days, 40),
        ]);
    }

    /** Bounded so a hand-typed window cannot ask for a scan of the whole table. */
    private function days(Request $request, int $default): int
    {
        return max(7, min(180, (int) $request->query('days', $default)));
    }
}
