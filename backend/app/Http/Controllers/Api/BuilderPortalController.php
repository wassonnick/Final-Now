<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AuthenticatesAccount;
use App\Http\Controllers\Controller;
use App\Models\BuilderClaim;
use App\Models\Review;
use App\Models\ReviewResponse;
use App\Models\Society;
use App\Models\SocietyAnnouncement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BuilderPortalController extends Controller
{
    use AuthenticatesAccount;

    public function claims(Request $request): JsonResponse
    {
        if (! $account = $this->accountFromBearer($request)) {
            return response()->json(['message' => 'OTP login required.'], 401);
        }

        return response()->json(['data' => $account->builderClaims()->where('claim_type', 'builder')->with(['society' => fn ($query) => $query->select('id', 'name', 'slug')->with(['reviews' => fn ($reviews) => $reviews->select('id', 'society_id', 'title', 'content', 'rating')->where('status', 'approved')]), 'announcements'])->latest()->get()]);
    }

    public function storeClaim(Request $request): JsonResponse
    {
        if (! $account = $this->accountFromBearer($request)) {
            return response()->json(['message' => 'OTP login required.'], 401);
        }
        // Verification substance: a builder claim must carry a checkable RERA/CIN number;
        // official website/email and an authorization letter link strengthen the review.
        $data = $request->validate(['society_id' => ['required', 'integer', 'exists:societies,id'], 'organisation_name' => ['required', 'string', 'max:255'], 'representative_name' => ['required', 'string', 'max:255'], 'representative_role' => ['required', 'string', 'max:255'], 'phone' => ['required', 'string', 'max:30'], 'email' => ['nullable', 'email', 'max:255'], 'registration_number' => ['required', 'string', 'min:5', 'max:120'], 'official_website' => ['nullable', 'url', 'max:500'], 'official_email' => ['nullable', 'email', 'max:255'], 'authorization_proof_url' => ['nullable', 'url', 'max:1000'], 'gst_number' => ['nullable', 'string', 'max:30'], 'proof_notes' => ['required', 'string', 'min:20', 'max:5000']]);
        $society = Society::query()->whereKey($data['society_id'])->where('is_published', true)->whereIn('status', ['Verified', 'Premium'])->first();
        if (! $society) {
            return response()->json(['message' => 'Claims are accepted only for published societies.'], 422);
        }
        $claim = BuilderClaim::updateOrCreate(['account_id' => $account->id, 'society_id' => $society->id, 'claim_type' => 'builder'], $data + ['status' => 'pending', 'review_notes' => null, 'reviewed_at' => null]);

        return response()->json(['message' => 'Claim submitted for admin verification.', 'data' => $claim], $claim->wasRecentlyCreated ? 201 : 200);
    }

    public function storeAnnouncement(Request $request, BuilderClaim $claim): JsonResponse
    {
        if (! $account = $this->accountFromBearer($request)) {
            return response()->json(['message' => 'OTP login required.'], 401);
        }
        if ($claim->account_id !== $account->id || $claim->claim_type !== 'builder' || $claim->status !== 'approved') {
            return response()->json(['message' => 'An approved claim is required.'], 403);
        }
        $data = $request->validate(['title' => ['required', 'string', 'max:255'], 'category' => ['required', 'in:update,maintenance,event,safety,notice'], 'content' => ['required', 'string', 'min:10', 'max:10000'], 'expires_at' => ['nullable', 'date', 'after:today']]);
        $item = $claim->announcements()->create($data + ['society_id' => $claim->society_id, 'status' => 'pending']);

        return response()->json(['message' => 'Announcement submitted for admin review.', 'data' => $item], 201);
    }

    public function announcements(string $idOrSlug): JsonResponse
    {
        $society = Society::query()->where('is_published', true)->whereIn('status', ['Verified', 'Premium'])->when(is_numeric($idOrSlug), fn ($q) => $q->whereKey($idOrSlug), fn ($q) => $q->where('slug', $idOrSlug))->firstOrFail();
        $items = SocietyAnnouncement::query()->where('society_id', $society->id)->where('status', 'published')->whereNotNull('published_at')->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))->latest('published_at')->get();

        return response()->json(['data' => $items]);
    }

    public function storeReviewResponse(Request $request, BuilderClaim $claim, Review $review): JsonResponse
    {
        if (! $account = $this->accountFromBearer($request)) {
            return response()->json(['message' => 'OTP login required.'], 401);
        }
        if ($claim->account_id !== $account->id || $claim->claim_type !== 'builder' || $claim->status !== 'approved' || $review->society_id !== $claim->society_id || $review->status !== 'approved') {
            return response()->json(['message' => 'An approved claim for this society is required.'], 403);
        }
        $data = $request->validate(['content' => ['required', 'string', 'min:10', 'max:5000']]);
        $response = ReviewResponse::updateOrCreate(['review_id' => $review->id, 'builder_claim_id' => $claim->id], $data + ['account_id' => $account->id, 'status' => 'pending', 'moderation_notes' => null, 'published_at' => null]);

        return response()->json(['message' => 'Response submitted for admin moderation.', 'data' => $response], $response->wasRecentlyCreated ? 201 : 200);
    }
}
