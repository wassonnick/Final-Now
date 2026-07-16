<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SocietyComparePage;
use Illuminate\Http\JsonResponse;

class SocietyComparePageController extends Controller
{
    public function index(): JsonResponse
    {
        $pages = SocietyComparePage::query()
            ->with(['societyA:id,name,slug,sector,locality,builder,score', 'societyB:id,name,slug,sector,locality,builder,score', 'societyC:id,name,slug,sector,locality,builder,score'])
            ->published()
            ->orderByDesc('published_at')
            ->paginate((int) request()->integer('per_page', 24));

        return response()->json([
            'status' => 'ok',
            'data' => $pages,
        ]);
    }

    public function show(string $slug): JsonResponse
    {
        $page = SocietyComparePage::query()
            ->with(['societyA', 'societyB', 'societyC'])
            ->published()
            ->where('slug', $slug)
            ->first();

        if (! $page || ! $this->allSocietiesPublic($page)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Comparison page not found.',
            ], 404);
        }

        return response()->json([
            'status' => 'ok',
            'data' => $this->publicPayload($page),
        ]);
    }

    private function allSocietiesPublic(SocietyComparePage $page): bool
    {
        foreach ([$page->societyA, $page->societyB, $page->societyC] as $society) {
            if (! $society || ! $society->is_published || ! in_array($society->status, ['Verified', 'Premium'], true)) {
                return false;
            }
        }

        return true;
    }

    private function publicPayload(SocietyComparePage $page): array
    {
        return [
            'id' => $page->id,
            'slug' => $page->slug,
            'title' => $page->title,
            'meta_title' => $page->meta_title,
            'meta_description' => $page->meta_description,
            'h1' => $page->h1,
            'comparison_type' => $page->comparison_type,
            'city' => $page->city,
            'sector_cluster' => $page->sector_cluster,
            'intro' => $page->intro,
            'comparison_summary' => $page->comparison_summary,
            'best_for_json' => $page->best_for_json,
            'comparison_table_json' => $page->comparison_table_json,
            'society_summaries_json' => $page->society_summaries_json,
            'recommendation_copy' => $page->recommendation_copy,
            'faq_json' => $page->faq_json,
            'internal_links_json' => $page->internal_links_json,
            'score' => $page->score,
            'content_quality_score' => $page->content_quality_score,
            'status' => $page->status,
            'published_at' => optional($page->published_at)->toISOString(),
            'updated_at' => optional($page->updated_at)->toISOString(),
            'societies' => collect([$page->societyA, $page->societyB, $page->societyC])->filter()->map(fn ($society) => [
                'id' => $society->id,
                'name' => $society->name,
                'slug' => $society->slug,
                'sector' => $society->sector,
                'locality' => $society->locality,
                'builder' => $society->builder,
                'score' => $society->score,
                'profile_url' => "/society/{$society->slug}",
            ])->values()->all(),
        ];
    }
}
