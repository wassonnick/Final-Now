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
        $query = Review::query()->with(['society:id,name,slug', 'account:id,name'])->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return response()->json($query->paginate(max(1, min($request->integer('per_page', 20), 100))));
    }

    public function update(Request $request, Review $review): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', 'in:pending,approved,rejected'],
            'moderation_notes' => ['nullable', 'string', 'max:3000'],
        ]);

        $review->update($validated);
        $this->refreshSocietyMetrics($review->society_id);

        return response()->json([
            'message' => 'Review moderation updated.',
            'data' => $review->fresh(['society:id,name,slug', 'account:id,name']),
        ]);
    }

    public function destroy(Review $review): JsonResponse
    {
        $societyId = $review->society_id;
        $review->delete();
        $this->refreshSocietyMetrics($societyId);

        return response()->json(['message' => 'Review deleted.']);
    }

    private function refreshSocietyMetrics(int $societyId): void
    {
        $approved = Review::query()->where('society_id', $societyId)->where('status', 'approved');

        Society::query()->whereKey($societyId)->update([
            'review_count' => (clone $approved)->count(),
            'avg_rating' => round((float) ((clone $approved)->avg('rating') ?: 0), 2),
        ]);
    }
}
