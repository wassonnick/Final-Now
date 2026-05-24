<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Society;
use App\Models\Property;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class SearchController extends Controller
{
    public function search(Request $request): JsonResponse
    {
        $query = $request->get('q', '');
        $filters = $request->except('q', 'page');

        // Search societies
        $societiesQuery = Society::with(['builder', 'locality'])
            ->where('status', 'active');

        if ($query) {
            $societiesQuery->where(function ($q) use ($query) {
                $q->where('name', 'ILIKE', "%{$query}%")
                  ->orWhere('address', 'ILIKE', "%{$query}%")
                  ->orWhereHas('locality', function ($lq) use ($query) {
                      $lq->where('name', 'ILIKE', "%{$query}%");
                  })
                  ->orWhereHas('builder', function ($bq) use ($query) {
                      $bq->where('name', 'ILIKE', "%{$query}%");
                  });
            });
        }

        // Apply filters
        if (isset($filters['locality'])) {
            $societiesQuery->whereHas('locality', function ($q) use ($filters) {
                $q->where('slug', $filters['locality']);
            });
        }

        if (isset($filters['minScore'])) {
            $societiesQuery->where('overall_score', '>=', $filters['minScore']);
        }

        $societies = $societiesQuery->orderBy('overall_score', 'desc')->paginate(20);

        return response()->json([
            'societies' => $societies->items(),
            'meta' => [
                'current_page' => $societies->currentPage(),
                'last_page' => $societies->lastPage(),
                'total' => $societies->total(),
            ]
        ]);
    }

    public function autocomplete(Request $request): JsonResponse
    {
        $query = $request->get('q', '');

        if (strlen($query) < 2) {
            return response()->json([]);
        }

        $societies = Society::where('name', 'ILIKE', "%{$query}%")
            ->where('status', 'active')
            ->limit(5)
            ->get(['id', 'name', 'slug']);

        $localities = Society::whereHas('locality', function ($q) use ($query) {
            $q->where('name', 'ILIKE', "%{$query}%");
        })
        ->where('status', 'active')
        ->with('locality')
        ->limit(5)
        ->get();

        return response()->json([
            'societies' => $societies,
            'localities' => $localities->pluck('locality')->unique('id')->values(),
        ]);
    }

    public function saveSearch(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string',
            'filters' => 'required|array',
        ]);

        $savedSearch = $request->user()->savedSearches()->create($validated);

        return response()->json($savedSearch, 201);
    }

    public function getSavedSearches(Request $request): JsonResponse
    {
        $searches = $request->user()->savedSearches()->get();

        return response()->json($searches);
    }
}
