<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\Ops\AiSpendTracker;
use Illuminate\Http\Request;

class AdminAiSpendController extends Controller
{
    public function __invoke(Request $request, AiSpendTracker $tracker)
    {
        $days = (int) $request->integer('days', 30);
        $limit = (int) $request->integer('limit', 50);

        return response()->json([
            'status' => 'ok',
            'data' => [
                'summary' => $tracker->summary($days),
                'recent' => $tracker->recent($limit)->map(fn ($log) => [
                    'id' => $log->id,
                    'provider' => $log->provider,
                    'feature' => $log->feature,
                    'operation' => $log->operation,
                    'model' => $log->model,
                    'status' => $log->status,
                    'input_tokens' => $log->input_tokens,
                    'output_tokens' => $log->output_tokens,
                    'total_tokens' => $log->total_tokens,
                    'image_count' => $log->image_count,
                    'estimated_cost_usd' => (float) $log->estimated_cost_usd,
                    'subject_type' => $log->subject_type,
                    'subject_id' => $log->subject_id,
                    'error_class' => $log->error_class,
                    'error_message' => $log->error_message,
                    'created_at' => $log->created_at?->toIso8601String(),
                ])->values(),
            ],
        ]);
    }
}
