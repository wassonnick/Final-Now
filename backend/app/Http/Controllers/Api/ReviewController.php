<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Review;
use App\Models\Society;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ReviewController extends Controller
{
    public function bySociety(string $idOrSlug, Request $request): JsonResponse
    {
        $society = Society::query()
            ->where('is_published', true)
            ->whereIn('status', ['Verified', 'Premium'])
            ->when(is_numeric($idOrSlug), fn ($query) => $query->whereKey($idOrSlug), fn ($query) => $query->where('slug', $idOrSlug))
            ->firstOrFail();

        $reviews = Review::query()
            ->with('account:id,name')
            ->where('society_id', $society->id)
            ->where('status', 'approved')
            ->latest()
            ->paginate(max(1, min($request->integer('per_page', 10), 30)));

        return response()->json([
            'data' => $reviews,
            'summary' => [
                'count' => (int) $society->review_count,
                'average' => (float) $society->avg_rating,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $account = $this->accountFromBearer($request);

        if (! $account) {
            return response()->json(['message' => 'Login with OTP before submitting a resident review.'], 401);
        }

        $validated = $request->validate([
            'society_id' => ['required', 'integer', 'exists:societies,id'],
            'rating' => ['required', 'numeric', 'min:1', 'max:5'],
            'title' => ['required', 'string', 'max:255'],
            'content' => ['required', 'string', 'min:20', 'max:5000'],
            'security_rating' => ['nullable', 'numeric', 'min:1', 'max:5'],
            'maintenance_rating' => ['nullable', 'numeric', 'min:1', 'max:5'],
            'amenities_rating' => ['nullable', 'numeric', 'min:1', 'max:5'],
            'connectivity_rating' => ['nullable', 'numeric', 'min:1', 'max:5'],
            'management_rating' => ['nullable', 'numeric', 'min:1', 'max:5'],
            'value_for_money_rating' => ['nullable', 'numeric', 'min:1', 'max:5'],
            'lived_duration_months' => ['nullable', 'integer', 'min:1', 'max:600'],
            'pros' => ['nullable', 'array', 'max:10'],
            'pros.*' => ['string', 'max:160'],
            'cons' => ['nullable', 'array', 'max:10'],
            'cons.*' => ['string', 'max:160'],
        ]);

        $society = Society::query()
            ->whereKey($validated['society_id'])
            ->where('is_published', true)
            ->whereIn('status', ['Verified', 'Premium'])
            ->first();

        if (! $society) {
            return response()->json(['message' => 'Reviews are available only for published societies.'], 422);
        }

        $review = Review::updateOrCreate(
            ['society_id' => $society->id, 'account_id' => $account->id],
            $validated + [
                'reviewer_name' => $account->name ?: 'Verified SocietyFlats user',
                'is_verified_resident' => (bool) $account->phone_verified_at,
                'status' => 'pending',
                'moderation_notes' => null,
            ],
        );

        return response()->json([
            'message' => 'Review submitted for admin moderation.',
            'data' => $review,
        ], $review->wasRecentlyCreated ? 201 : 200);
    }

    public function markHelpful(Review $review, Request $request): JsonResponse
    {
        $account = $this->accountFromBearer($request);

        if (! $account) {
            return response()->json(['message' => 'Login with OTP to vote on reviews.'], 401);
        }

        if ($review->status !== 'approved') {
            return response()->json(['message' => 'Only approved reviews can receive helpful votes.'], 422);
        }

        $voted = DB::transaction(function () use ($review, $account) {
            $existing = $review->helpfulVotes()->where('account_id', $account->id)->first();

            if ($existing) {
                $existing->delete();
                $review->decrement('helpful_count');

                return false;
            }

            $review->helpfulVotes()->create([
                'account_id' => $account->id,
                'is_helpful' => true,
            ]);
            $review->increment('helpful_count');

            return true;
        });

        return response()->json([
            'message' => $voted ? 'Marked as helpful.' : 'Helpful vote removed.',
            'helpful' => $voted,
            'helpful_count' => $review->fresh()->helpful_count,
        ]);
    }

    private function accountFromBearer(Request $request): ?Account
    {
        $token = trim((string) $request->bearerToken());

        if ($token === '' || strlen($token) < 40) {
            return null;
        }

        return Account::query()
            ->where('api_token_hash', hash('sha256', $token))
            ->where('status', 'active')
            ->first();
    }
}
