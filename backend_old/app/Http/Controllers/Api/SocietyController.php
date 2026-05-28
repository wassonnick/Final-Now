<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Society;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SocietyController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Society::with(['builder', 'locality'])
            ->where('status', 'active');

        // Apply filters
        if ($request->has('locality')) {
            $query->whereHas('locality', function ($q) use ($request) {
                $q->where('slug', $request->locality);
            });
        }

        if ($request->has('minScore')) {
            $query->where('overall_score', '>=', $request->minScore);
        }

        if ($request->has('featured')) {
            $query->where('featured', true);
        }

        // Sorting
        $sortBy = $request->get('sortBy', 'recommended');
        switch ($sortBy) {
            case 'score_desc':
                $query->orderBy('overall_score', 'desc');
                break;
            case 'reviews_desc':
                $query->orderBy('review_count', 'desc');
                break;
            default:
                $query->orderBy('featured', 'desc')
                      ->orderBy('overall_score', 'desc');
        }

        $societies = $query->paginate(20);

        return response()->json([
            'data' => $societies->items(),
            'meta' => [
                'current_page' => $societies->currentPage(),
                'last_page' => $societies->lastPage(),
                'per_page' => $societies->perPage(),
                'total' => $societies->total(),
            ]
        ]);
    }

    public function featured(): JsonResponse
    {
        $societies = Society::with(['builder', 'locality'])
            ->where('status', 'active')
            ->where('featured', true)
            ->orderBy('overall_score', 'desc')
            ->limit(8)
            ->get();

        return response()->json($societies);
    }

    public function show(string $slug): JsonResponse
    {
        $society = Society::with(['builder', 'locality', 'properties' => function ($q) {
            $q->where('status', 'active')->where('is_available', true);
        }])
        ->where('slug', $slug)
        ->firstOrFail();

        // Increment view count
        $society->increment('view_count');

        return response()->json($society);
    }

    public function intelligence(string $id): JsonResponse
    {
        $society = Society::findOrFail($id);

        return response()->json([
            'score_breakdown' => $society->score_breakdown,
            'intelligence_summary' => $society->intelligence_summary,
        ]);
    }

    public function byLocality(string $id): JsonResponse
    {
        $societies = Society::with(['builder', 'locality'])
            ->where('locality_id', $id)
            ->where('status', 'active')
            ->orderBy('overall_score', 'desc')
            ->get();

        return response()->json($societies);
    }
}
