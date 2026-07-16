<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Society;
use App\Models\SocietyComparePage;
use App\Services\SocietyComparePageGenerator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

class AdminSocietyComparePageController extends Controller
{
    public function index(): JsonResponse
    {
        $pages = SocietyComparePage::query()
            ->with(['societyA:id,name,slug', 'societyB:id,name,slug', 'societyC:id,name,slug'])
            ->latest()
            ->paginate((int) request()->integer('per_page', 24));

        $counts = SocietyComparePage::query()
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        return response()->json([
            'status' => 'ok',
            'data' => $pages,
            'summary' => [
                'total_generated' => SocietyComparePage::count(),
                'needs_review' => (int) ($counts[SocietyComparePage::STATUS_NEEDS_REVIEW] ?? 0),
                'published' => (int) ($counts[SocietyComparePage::STATUS_PUBLISHED] ?? 0),
                'stale' => (int) ($counts[SocietyComparePage::STATUS_STALE] ?? 0),
                'missing_data' => 0,
                'duplicate_skipped' => 0,
            ],
        ]);
    }

    public function generate(Request $request, SocietyComparePageGenerator $generator): JsonResponse
    {
        $society = Society::query()->findOrFail($request->integer('society_id'));
        $result = $generator->generateForSociety($society);

        return response()->json([
            'status' => 'ok',
            'summary' => $result,
        ], in_array($result['status'] ?? '', ['created', 'updated'], true) ? 201 : 422);
    }

    public function bulkGenerate(Request $request, SocietyComparePageGenerator $generator): JsonResponse
    {
        $summary = $generator->generateForAll((int) $request->integer('limit', 100));

        return response()->json([
            'status' => 'ok',
            'summary' => $summary,
        ], 202);
    }

    public function show(SocietyComparePage $comparePage): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'data' => $comparePage->load(['societyA', 'societyB', 'societyC']),
        ]);
    }

    public function update(Request $request, SocietyComparePage $comparePage): JsonResponse
    {
        $allowed = [
            'title',
            'meta_title',
            'meta_description',
            'h1',
            'intro',
            'comparison_summary',
            'best_for_json',
            'comparison_table_json',
            'society_summaries_json',
            'recommendation_copy',
            'faq_json',
            'internal_links_json',
            'score',
            'content_quality_score',
            'status',
            'stale_reason',
        ];

        $payload = Arr::only($request->all(), $allowed);

        if (($payload['status'] ?? null) === SocietyComparePage::STATUS_PUBLISHED) {
            unset($payload['status']);
        }

        $comparePage->update($payload);

        return response()->json([
            'status' => 'ok',
            'data' => $comparePage->fresh()->load(['societyA', 'societyB', 'societyC']),
        ]);
    }

    public function approve(Request $request, SocietyComparePage $comparePage): JsonResponse
    {
        if ($comparePage->content_quality_score < SocietyComparePageGenerator::QUALITY_THRESHOLD) {
            return response()->json([
                'status' => 'error',
                'message' => 'Quality score is below publish threshold.',
            ], 422);
        }

        $comparePage->update([
            'status' => SocietyComparePage::STATUS_APPROVED,
            'reviewed_by' => $request->user()?->email ?: 'admin',
            'reviewed_at' => now(),
            'published_at' => null,
            'stale_reason' => null,
        ]);

        return response()->json(['status' => 'ok', 'data' => $comparePage->fresh()]);
    }

    public function publish(SocietyComparePage $comparePage): JsonResponse
    {
        $comparePage->load(['societyA', 'societyB', 'societyC']);

        foreach ([$comparePage->societyA, $comparePage->societyB, $comparePage->societyC] as $society) {
            if (! $society || ! $society->is_published || ! in_array($society->status, ['Verified', 'Premium'], true)) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'All societies must remain published before publishing this comparison page.',
                ], 422);
            }
        }

        if (! in_array($comparePage->status, [SocietyComparePage::STATUS_APPROVED, SocietyComparePage::STATUS_PUBLISHED], true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Comparison page must be approved before publishing.',
            ], 422);
        }

        $comparePage->update([
            'status' => SocietyComparePage::STATUS_PUBLISHED,
            'published_at' => now(),
            'stale_reason' => null,
        ]);

        return response()->json(['status' => 'ok', 'data' => $comparePage->fresh()]);
    }

    public function unpublish(SocietyComparePage $comparePage): JsonResponse
    {
        $comparePage->update([
            'status' => SocietyComparePage::STATUS_APPROVED,
            'published_at' => null,
        ]);

        return response()->json(['status' => 'ok', 'data' => $comparePage->fresh()]);
    }

    public function regenerate(SocietyComparePage $comparePage, SocietyComparePageGenerator $generator): JsonResponse
    {
        $result = $generator->generateForSociety($comparePage->societyA, true);

        return response()->json([
            'status' => 'ok',
            'summary' => $result,
        ]);
    }
}
