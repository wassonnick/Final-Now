<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Society;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminReviewController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Review::with(['society', 'user'])->latest();

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        return response()->json($query->paginate((int) $request->query('per_page', 20)));
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $review = Review::findOrFail($id);
        $validated = $request->validate([
            'status' => 'required|in:pending,approved,rejected',
            'moderation_notes' => 'nullable|string',
        ]);

        $review->update($validated);

        $society = Society::find($review->society_id);
        if ($society) {
            $society->update([
                'review_count' => $society->reviews()->count(),
                'avg_rating' => $society->reviews()->avg('rating') ?: 0,
            ]);
        }

        return response()->json($review->fresh(['society', 'user']));
    }

    public function destroy(string $id): JsonResponse
    {
        Review::findOrFail($id)->delete();
        return response()->json(['message' => 'Review deleted']);
    }
}
