<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\Society;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class ReviewController extends Controller
{
    public function bySociety(string $societyId, Request $request): JsonResponse
    {
        $reviews = Review::with('user')
            ->where('society_id', $societyId)
            ->where('status', 'approved')
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return response()->json($reviews);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'society_id' => 'required|uuid|exists:societies,id',
            'rating' => 'required|numeric|min:1|max:5',
            'title' => 'required|string|max:255',
            'content' => 'required|string',
            'security_rating' => 'nullable|numeric|min:1|max:5',
            'maintenance_rating' => 'nullable|numeric|min:1|max:5',
            'amenities_rating' => 'nullable|numeric|min:1|max:5',
            'connectivity_rating' => 'nullable|numeric|min:1|max:5',
            'management_rating' => 'nullable|numeric|min:1|max:5',
            'value_for_money_rating' => 'nullable|numeric|min:1|max:5',
            'lived_duration_months' => 'nullable|integer',
            'pros' => 'nullable|array',
            'cons' => 'nullable|array',
        ]);

        $validated['user_id'] = $request->user()->id;
        $validated['status'] = 'pending'; // Requires moderation

        $review = Review::create($validated);

        // Update society review count and average rating
        $society = Society::find($validated['society_id']);
        $society->increment('review_count');
        $society->update([
            'avg_rating' => $society->reviews()->avg('rating')
        ]);

        return response()->json($review, 201);
    }

    public function markHelpful(string $id, Request $request): JsonResponse
    {
        $review = Review::findOrFail($id);

        // Check if user already voted
        $existingVote = $review->helpfulVotes()
            ->where('user_id', $request->user()->id)
            ->first();

        if ($existingVote) {
            $existingVote->delete();
            $review->decrement('helpful_count');
            return response()->json(['message' => 'Vote removed']);
        }

        $review->helpfulVotes()->create([
            'user_id' => $request->user()->id,
            'is_helpful' => true,
        ]);

        $review->increment('helpful_count');

        return response()->json(['message' => 'Marked as helpful']);
    }
}
