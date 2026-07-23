<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\OpsDigest;
use App\Models\OpsSuggestion;
use App\Models\Society;
use App\Services\Ops\AdminOpsInboxService;
use App\Services\Ops\AiBudgetGuard;
use App\Services\Ops\MarketSuggestionService;
use App\Services\Society\Import\SocietyDraftCompletionService;
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

    /**
     * Why is automation stalling? Surfaces the two things that silently block the
     * nightly society-publish + SEO-task sweeps: the AI budget / provider circuit
     * breaker, and the unpublished-draft backlog broken down by the gate each draft
     * is stuck on (approved cover, published SEO, description, score, location).
     */
    public function automationHealth(AiBudgetGuard $budget, SocietyDraftCompletionService $completion): JsonResponse
    {
        $autoComplete = (bool) config('services.ops.auto_complete_imports');

        $drafts = Society::query()
            ->where('is_published', false)
            ->whereNotNull('imported_at')
            ->orderBy('id')
            ->get();

        $gateCounts = ['description' => 0, 'score' => 0, 'sector_or_locality' => 0, 'published_seo' => 0];
        $noCover = 0; // Soft flag — publishes with a placeholder, never blocks.
        $samples = [];
        foreach ($drafts as $society) {
            $missing = $completion->missing($society);
            foreach ($missing as $gate) {
                if (isset($gateCounts[$gate])) {
                    $gateCounts[$gate]++;
                }
            }
            if (! $society->image_approved_by_admin) {
                $noCover++;
            }
            if (count($samples) < 20) {
                $samples[] = [
                    'id' => $society->id,
                    'name' => $society->name,
                    'slug' => $society->slug,
                    'missing' => $missing,
                    'no_cover_image' => ! $society->image_approved_by_admin,
                ];
            }
        }

        return response()->json([
            'status' => 'ok',
            'data' => [
                'ai_budget' => [
                    'used' => $budget->used(),
                    'cap' => $budget->cap(),
                    'remaining' => $budget->remaining(),
                    'provider_limited' => $budget->providerLimited(),
                ],
                'publishing' => [
                    'auto_complete_imports_enabled' => $autoComplete,
                    'unpublished_drafts' => $drafts->count(),
                    'blocked_by_gate' => $gateCounts,
                    'note' => $autoComplete
                        ? 'Nightly complete-drafts sweep is ON. Drafts still listed are blocked by the gates above.'
                        : 'Nightly complete-drafts sweep is OFF (IMPORT_AUTO_COMPLETE not set). Enable it, or click "Complete all drafts now".',
                    'samples' => $samples,
                ],
            ],
        ]);
    }

    /**
     * Manually clear the AI provider circuit breaker after topping up credits or
     * resolving a billing block — otherwise automated jobs stay short-circuited for
     * up to 12 hours after the last provider limit was hit.
     */
    public function clearProviderLimit(AiBudgetGuard $budget): JsonResponse
    {
        $wasLimited = $budget->providerLimited();
        $budget->clearProviderLimit();

        return response()->json([
            'status' => 'ok',
            'message' => $wasLimited
                ? 'AI provider limit cleared. Automated jobs will resume on the next tick.'
                : 'No provider limit was active.',
        ]);
    }
}
