<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\BuilderClaim;
use App\Models\ReviewResponse;
use App\Models\SocietyAnnouncement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminBuilderPortalController extends Controller
{
    public function claims(): JsonResponse
    {
        return response()->json(['data' => BuilderClaim::with(['account:id,name,phone,email', 'society:id,name,slug'])->latest()->get()]);
    }

    public function updateClaim(Request $request, BuilderClaim $claim): JsonResponse
    {
        $data = $request->validate(['status' => ['required', 'in:pending,approved,rejected'], 'review_notes' => ['nullable', 'string', 'max:3000']]);
        $claim->update($data + ['reviewed_at' => $data['status'] === 'pending' ? null : now()]);

        return response()->json(['message' => 'Claim review updated.', 'data' => $claim]);
    }

    public function announcements(): JsonResponse
    {
        return response()->json(['data' => SocietyAnnouncement::with(['society:id,name,slug', 'claim:id,organisation_name'])->latest()->get()]);
    }

    public function updateAnnouncement(Request $request, SocietyAnnouncement $announcement): JsonResponse
    {
        $data = $request->validate(['status' => ['required', 'in:pending,published,rejected'], 'review_notes' => ['nullable', 'string', 'max:3000']]);
        $announcement->update($data + ['published_at' => $data['status'] === 'published' ? ($announcement->published_at ?: now()) : null]);

        return response()->json(['message' => 'Announcement review updated.', 'data' => $announcement]);
    }

    public function reviewResponses(): JsonResponse
    {
        return response()->json(['data' => ReviewResponse::with(['review:id,title,society_id', 'review.society:id,name,slug', 'claim:id,organisation_name'])->latest()->get()]);
    }

    public function updateReviewResponse(Request $request, ReviewResponse $response): JsonResponse
    {
        $data = $request->validate(['status' => ['required', 'in:pending,approved,rejected'], 'moderation_notes' => ['nullable', 'string', 'max:3000']]);
        $response->update($data + ['published_at' => $data['status'] === 'approved' ? ($response->published_at ?: now()) : null]);

        return response()->json(['message' => 'Review response moderation updated.', 'data' => $response]);
    }
}
