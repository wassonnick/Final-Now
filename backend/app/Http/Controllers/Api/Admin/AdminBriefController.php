<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\SavedSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Every brief people have built, whether or not they sent it.
 *
 * The demand-gap report says which buckets are worth acting on; this is the raw record
 * underneath it — including the briefs nobody sent, which are the interesting ones. A
 * person who answered nine questions and then left is telling you something specific about
 * what is missing, and that was previously visible nowhere at all.
 */
class AdminBriefController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $days = max(1, min(365, (int) $request->query('days', 60)));
        $since = now()->subDays($days)->startOfDay();

        $briefs = SavedSearch::query()
            ->briefs()
            ->with('account:id,name,phone')
            ->where('created_at', '>=', $since)
            ->latest()
            ->limit(200)
            ->get();

        // Which of these turned into an enquiry. Matched on the brief builder as a source
        // and a shared window rather than an id, because a sent brief becomes a Lead
        // without carrying its own key across.
        $sentLeads = Lead::query()
            ->where('created_at', '>=', $since)
            ->where(fn ($query) => $query->where('source', 'brief_builder')->orWhere('cta_label', 'Brief builder'))
            ->count();

        return response()->json([
            'status' => 'ok',
            'window_days' => $days,
            'summary' => [
                'briefs' => $briefs->count(),
                'anonymous' => $briefs->whereNull('account_id')->count(),
                'saved_to_account' => $briefs->whereNotNull('account_id')->count(),
                'sent_as_enquiry' => $sentLeads,
                'with_notes' => $briefs->filter(fn (SavedSearch $b) => filled($b->filters['notes'] ?? null))->count(),
            ],
            'data' => $briefs->map(function (SavedSearch $brief) {
                $filters = $brief->filters ?: [];

                return [
                    'id' => $brief->id,
                    'created_at' => $brief->created_at?->toIso8601String(),
                    'anonymous' => $brief->account_id === null,
                    // Only shown for briefs somebody deliberately saved to their account.
                    'account' => $brief->account ? ['name' => $brief->account->name, 'phone' => $brief->account->phone] : null,
                    'mode' => $filters['mode'] ?? 'rent',
                    'purpose' => $filters['purpose'] ?? '',
                    'city' => $filters['city'] ?? '',
                    'where' => $filters['where'] ?? '',
                    'commute' => $filters['commute'] ?? '',
                    'bhk' => $filters['bhk'] ?? '',
                    'budget' => $filters['budget'] ?? '',
                    'timeline' => $filters['timeline'] ?? '',
                    'priorities' => $filters['priorities'] ?? '',
                    'notes' => $filters['notes'] ?? '',
                    'shortlisted' => (int) ($filters['shortlisted'] ?? 0),
                    'scanned' => (int) ($filters['scanned'] ?? 0),
                    'alerts' => (bool) $brief->alert_enabled,
                ];
            })->values(),
        ]);
    }
}
