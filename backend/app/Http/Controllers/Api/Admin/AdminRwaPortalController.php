<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\BuilderClaim;
use App\Models\RwaReply;
use App\Models\RwaThread;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminRwaPortalController extends Controller
{
    public function claims(): JsonResponse
    {
        return response()->json(['data' => BuilderClaim::with(['account:id,name,phone,email', 'society:id,name,slug,sector,locality'])
            ->where('claim_type', 'rwa')
            ->latest()
            ->get()]);
    }

    public function updateClaim(Request $request, BuilderClaim $claim): JsonResponse
    {
        abort_if($claim->claim_type !== 'rwa', 404);
        $data = $request->validate(['status' => ['required', Rule::in(['pending', 'approved', 'rejected'])], 'review_notes' => ['nullable', 'string', 'max:3000']]);
        $claim->update($data + ['reviewed_at' => $data['status'] === 'pending' ? null : now()]);

        return response()->json(['message' => 'RWA claim review updated.', 'data' => $claim->load(['account:id,name,phone,email', 'society:id,name,slug'])]);
    }

    public function threads(): JsonResponse
    {
        return response()->json(['data' => RwaThread::with(['society:id,name,slug', 'account:id,name,phone', 'claim:id,organisation_name'])
            ->latest()
            ->limit(200)
            ->get()]);
    }

    public function updateThread(Request $request, RwaThread $thread): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', Rule::in(['pending', 'approved', 'rejected'])],
            'moderation_notes' => ['nullable', 'string', 'max:3000'],
            'resolved' => ['nullable', 'boolean'],
        ]);
        $thread->update([
            'status' => $data['status'],
            'moderation_notes' => $data['moderation_notes'] ?? $thread->moderation_notes,
            'published_at' => $data['status'] === 'approved' ? ($thread->published_at ?: now()) : null,
            'resolved_at' => array_key_exists('resolved', $data) ? ($data['resolved'] ? now() : null) : $thread->resolved_at,
        ]);

        return response()->json(['message' => 'RWA thread moderation updated.', 'data' => $thread->fresh()->load(['society:id,name,slug'])]);
    }

    public function replies(): JsonResponse
    {
        return response()->json(['data' => RwaReply::with(['thread:id,title,society_id', 'thread.society:id,name,slug', 'account:id,name,phone', 'claim:id,organisation_name'])
            ->latest()
            ->limit(200)
            ->get()]);
    }

    public function updateReply(Request $request, RwaReply $reply): JsonResponse
    {
        $data = $request->validate(['status' => ['required', Rule::in(['pending', 'approved', 'rejected'])], 'moderation_notes' => ['nullable', 'string', 'max:3000']]);
        $wasApproved = $reply->status === 'approved';
        $reply->update($data + ['published_at' => $data['status'] === 'approved' ? ($reply->published_at ?: now()) : null]);
        if (! $wasApproved && $reply->status === 'approved') {
            $reply->thread()->increment('reply_count');
        }
        if ($wasApproved && $reply->status !== 'approved') {
            $reply->thread()->where('reply_count', '>', 0)->decrement('reply_count');
        }

        return response()->json(['message' => 'RWA reply moderation updated.', 'data' => $reply->fresh()->load(['thread:id,title,society_id'])]);
    }
}
