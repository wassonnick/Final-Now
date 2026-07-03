<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\OpsDigest;
use App\Models\OpsSuggestion;
use App\Services\Ops\AdminOpsInboxService;
use App\Services\Ops\MarketSuggestionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminOpsController extends Controller
{
    /**
     * Action Inbox: live operational report plus the latest stored daily
     * digest snapshot. Live compute skips the external sitemap fetch unless
     * explicitly requested, so the dashboard stays fast; the daily digest
     * always includes it.
     */
    public function actionInbox(Request $request, AdminOpsInboxService $inbox): JsonResponse
    {
        $latest = OpsDigest::query()->orderByDesc('digest_date')->first();

        return response()->json([
            'status' => 'ok',
            'data' => [
                'live' => $inbox->build($request->boolean('include_sitemap', false)),
                'last_digest' => $latest ? [
                    'digest_date' => $latest->digest_date->toDateString(),
                    'payload' => $latest->payload,
                ] : null,
            ],
        ]);
    }

    public function suggestions(Request $request): JsonResponse
    {
        $status = in_array($request->query('status'), OpsSuggestion::STATUSES, true) ? $request->query('status') : 'pending';

        $items = OpsSuggestion::with('society:id,name,slug')
            ->where('status', $status)
            ->orderByDesc('updated_at')
            ->limit(100)
            ->get()
            ->map(fn ($s) => [
                'id' => $s->id,
                'kind' => $s->kind,
                'status' => $s->status,
                'society_id' => $s->society_id,
                'society_name' => $s->society?->name,
                'society_slug' => $s->society?->slug,
                'payload' => $s->payload,
                'updated_at' => $s->updated_at?->toIso8601String(),
            ]);

        return response()->json(['status' => 'ok', 'data' => $items]);
    }

    public function applySuggestion(OpsSuggestion $suggestion, MarketSuggestionService $market): JsonResponse
    {
        if ($suggestion->kind !== 'market_refresh') {
            return response()->json(['status' => 'error', 'message' => 'Only market suggestions can be applied directly; cover photos are re-approved in the image workflow.'], 422);
        }

        try {
            $society = $market->apply($suggestion);
        } catch (\InvalidArgumentException $exception) {
            return response()->json(['status' => 'error', 'message' => $exception->getMessage()], 422);
        }

        return response()->json(['status' => 'ok', 'message' => 'Market data applied and flagged for verification.', 'data' => $society]);
    }

    public function dismissSuggestion(OpsSuggestion $suggestion): JsonResponse
    {
        if ($suggestion->status !== 'pending') {
            return response()->json(['status' => 'error', 'message' => 'Only pending suggestions can be dismissed.'], 422);
        }

        $suggestion->update(['status' => 'dismissed', 'resolved_at' => now()]);

        return response()->json(['status' => 'ok', 'message' => 'Suggestion dismissed.']);
    }
}
