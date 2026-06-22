<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\RentHistory;
use App\Models\Society;
use Illuminate\Http\JsonResponse;

class RentHistoryController extends Controller
{
    public function bySociety(string $idOrSlug): JsonResponse
    {
        $society = Society::query()->where('is_published', true)->whereIn('status', ['Verified', 'Premium'])
            ->when(is_numeric($idOrSlug), fn ($q) => $q->whereKey($idOrSlug), fn ($q) => $q->where('slug', $idOrSlug))->firstOrFail();
        $rows = RentHistory::query()->where('society_id', $society->id)->where('status', 'verified')->orderBy('recorded_on')->orderBy('bhk')->get();

        return response()->json(['society' => $society->only(['id', 'name', 'slug', 'locality', 'city']), 'data' => $rows]);
    }

    public function trends(): JsonResponse
    {
        $rows = RentHistory::query()->with('society:id,name,slug,locality,city')->where('status', 'verified')
            ->whereHas('society', fn ($q) => $q->where('is_published', true)->whereIn('status', ['Verified', 'Premium']))
            ->orderBy('recorded_on')->get()->groupBy('society_id')->map(function ($items) {
                $first = $items->first();
                $last = $items->last();

                return ['society' => $last->society, 'first_recorded_on' => $first->recorded_on, 'latest_recorded_on' => $last->recorded_on,
                    'first_median_rent' => $first->median_rent, 'latest_median_rent' => $last->median_rent,
                    'change_percent' => $first->median_rent > 0 ? round((($last->median_rent - $first->median_rent) / $first->median_rent) * 100, 1) : null];
            })->values();

        return response()->json(['data' => $rows, 'methodology' => 'Only admin-verified source records for published societies are included.']);
    }
}
