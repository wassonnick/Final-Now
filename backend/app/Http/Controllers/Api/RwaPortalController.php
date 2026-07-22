<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Concerns\AuthenticatesAccount;
use App\Http\Controllers\Controller;
use App\Models\BuilderClaim;
use App\Models\RwaReply;
use App\Models\RwaThread;
use App\Models\Society;
use App\Models\SocietyAnnouncement;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RwaPortalController extends Controller
{
    use AuthenticatesAccount;

    private function society(string $idOrSlug): Society
    {
        return Society::query()
            ->where('is_published', true)
            ->whereIn('status', ['Verified', 'Premium'])
            ->when(is_numeric($idOrSlug), fn ($q) => $q->whereKey($idOrSlug), fn ($q) => $q->where('slug', $idOrSlug))
            ->firstOrFail();
    }

    private function approvedClaimFor($account, int $societyId): ?BuilderClaim
    {
        if (! $account) {
            return null;
        }

        return BuilderClaim::query()
            ->where('account_id', $account->id)
            ->where('society_id', $societyId)
            ->where('claim_type', 'rwa')
            ->where('status', 'approved')
            ->first();
    }

    public function show(string $idOrSlug): JsonResponse
    {
        $society = $this->society($idOrSlug);
        $claim = BuilderClaim::query()
            ->where('society_id', $society->id)
            ->where('claim_type', 'rwa')
            ->where('status', 'approved')
            ->latest('reviewed_at')
            ->first();
        $threads = RwaThread::query()
            ->with(['replies' => fn ($q) => $q->where('status', 'approved')->latest('published_at')->limit(3)])
            ->where('society_id', $society->id)
            ->where('visibility', 'public')
            ->where('status', 'approved')
            ->whereNotNull('published_at')
            ->latest('published_at')
            ->limit(12)
            ->get();
        $announcements = SocietyAnnouncement::query()
            ->where('society_id', $society->id)
            ->where('status', 'published')
            ->whereNotNull('published_at')
            ->where(fn ($q) => $q->whereNull('expires_at')->orWhere('expires_at', '>', now()))
            ->latest('published_at')
            ->limit(6)
            ->get();

        return response()->json(['data' => [
            'society' => $society->only(['id', 'name', 'slug', 'builder', 'sector', 'locality', 'city', 'state', 'score']),
            'rwa' => $claim ? $claim->only(['id', 'organisation_name', 'representative_role', 'reviewed_at']) : null,
            'announcements' => $announcements,
            'threads' => $threads,
            'stats' => [
                'announcements' => $announcements->count(),
                'open_threads' => RwaThread::where('society_id', $society->id)->where('status', 'approved')->whereNull('resolved_at')->count(),
                'resolved_threads' => RwaThread::where('society_id', $society->id)->whereNotNull('resolved_at')->count(),
                'claim_status' => $claim ? 'claimed' : 'unclaimed',
                'questions' => RwaThread::where('society_id', $society->id)->where('type', 'question')->where('status', 'approved')->count(),
                'grievances' => RwaThread::where('society_id', $society->id)->where('type', 'grievance')->where('status', 'approved')->count(),
                'resolved' => RwaThread::where('society_id', $society->id)->whereNotNull('resolved_at')->count(),
            ],
        ]]);
    }

    public function dashboard(Request $request): JsonResponse
    {
        if (! $account = $this->accountFromBearer($request)) {
            return response()->json(['message' => 'OTP login required.'], 401);
        }

        $claims = BuilderClaim::query()
            ->with(['society:id,name,slug,sector,locality', 'announcements' => fn ($q) => $q->latest()->limit(10)])
            ->where('account_id', $account->id)
            ->where('claim_type', 'rwa')
            ->latest()
            ->get();
        $societyIds = $claims->pluck('society_id')->all();

        return response()->json(['data' => [
            'claims' => $claims,
            'threads' => RwaThread::with(['society:id,name,slug', 'account:id,name,phone'])
                ->whereIn('society_id', $societyIds ?: [0])
                ->latest()
                ->limit(50)
                ->get(),
            'replies' => RwaReply::with(['thread:id,title,society_id', 'thread.society:id,name,slug'])
                ->whereIn('builder_claim_id', $claims->pluck('id')->all() ?: [0])
                ->latest()
                ->limit(30)
                ->get(),
        ]]);
    }

    public function storeClaim(Request $request): JsonResponse
    {
        if (! $account = $this->accountFromBearer($request)) {
            return response()->json(['message' => 'OTP login required.'], 401);
        }

        // Verification substance: an RWA claim must carry the society/RWA registration
        // number; an authorization proof link (board resolution / letter) helps the review.
        $data = $request->validate([
            'society_id' => ['required', 'integer', 'exists:societies,id'],
            'organisation_name' => ['required', 'string', 'max:255'],
            'representative_name' => ['required', 'string', 'max:255'],
            'representative_role' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'registration_number' => ['required', 'string', 'min:5', 'max:120'],
            'official_website' => ['nullable', 'url', 'max:500'],
            'official_email' => ['nullable', 'email', 'max:255'],
            'authorization_proof_url' => ['nullable', 'url', 'max:1000'],
            'proof_notes' => ['required', 'string', 'min:20', 'max:5000'],
        ]);

        $society = Society::query()->whereKey($data['society_id'])->where('is_published', true)->whereIn('status', ['Verified', 'Premium'])->first();
        if (! $society) {
            return response()->json(['message' => 'RWA claims are accepted only for published societies.'], 422);
        }

        $claim = BuilderClaim::updateOrCreate(
            ['account_id' => $account->id, 'society_id' => $society->id, 'claim_type' => 'rwa'],
            $data + ['status' => 'pending', 'review_notes' => null, 'reviewed_at' => null]
        );

        return response()->json(['message' => 'RWA claim submitted for SocietyFlats verification.', 'data' => $claim], $claim->wasRecentlyCreated ? 201 : 200);
    }

    public function storeAnnouncement(Request $request, BuilderClaim $claim): JsonResponse
    {
        if (! $account = $this->accountFromBearer($request)) {
            return response()->json(['message' => 'OTP login required.'], 401);
        }
        if ($claim->account_id !== $account->id || $claim->claim_type !== 'rwa' || $claim->status !== 'approved') {
            return response()->json(['message' => 'An approved RWA claim is required.'], 403);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'category' => ['required', Rule::in(['notice', 'maintenance', 'event', 'safety', 'finance', 'meeting', 'update'])],
            'content' => ['required', 'string', 'min:10', 'max:10000'],
            'expires_at' => ['nullable', 'date', 'after:today'],
        ]);

        $item = $claim->announcements()->create($data + ['society_id' => $claim->society_id, 'status' => 'pending']);

        return response()->json(['message' => 'RWA announcement submitted for admin review.', 'data' => $item], 201);
    }

    public function storeThread(Request $request, string $idOrSlug): JsonResponse
    {
        $society = $this->society($idOrSlug);
        $account = $this->accountFromBearer($request);
        $claim = $this->approvedClaimFor($account, $society->id);
        $data = $request->validate([
            'type' => ['required', Rule::in(['question', 'discussion', 'grievance'])],
            'category' => ['nullable', 'string', 'max:80'],
            'title' => ['required', 'string', 'max:180'],
            'body' => ['required', 'string', 'min:10', 'max:8000'],
            'visibility' => ['nullable', Rule::in(['public', 'residents'])],
            'priority' => ['nullable', Rule::in(['low', 'normal', 'high', 'urgent'])],
        ]);

        $thread = RwaThread::create($data + [
            'society_id' => $society->id,
            'account_id' => $account?->id,
            'builder_claim_id' => $claim?->id,
            'category' => $data['category'] ?? 'general',
            'visibility' => $data['visibility'] ?? 'public',
            'priority' => $data['priority'] ?? ($data['type'] === 'grievance' ? 'high' : 'normal'),
            'status' => $claim ? 'approved' : 'pending',
            'published_at' => $claim ? now() : null,
            'metadata' => ['submitted_via' => 'rwa_public_page', 'official_rwa' => (bool) $claim],
        ]);

        return response()->json(['message' => $claim ? 'RWA thread published.' : 'Thread submitted for moderation.', 'data' => $thread], 201);
    }

    public function storeReply(Request $request, RwaThread $thread): JsonResponse
    {
        if (! $account = $this->accountFromBearer($request)) {
            return response()->json(['message' => 'OTP login required.'], 401);
        }
        $claim = $this->approvedClaimFor($account, $thread->society_id);
        $data = $request->validate(['body' => ['required', 'string', 'min:3', 'max:5000']]);

        $reply = $thread->replies()->create($data + [
            'account_id' => $account->id,
            'builder_claim_id' => $claim?->id,
            'is_official' => (bool) $claim,
            'status' => $claim ? 'approved' : 'pending',
            'published_at' => $claim ? now() : null,
        ]);
        if ($reply->status === 'approved') {
            $thread->increment('reply_count');
        }

        return response()->json(['message' => $claim ? 'Official RWA reply published.' : 'Reply submitted for moderation.', 'data' => $reply], 201);
    }

    public function resolveThread(Request $request, RwaThread $thread): JsonResponse
    {
        if (! $account = $this->accountFromBearer($request)) {
            return response()->json(['message' => 'OTP login required.'], 401);
        }
        if (! $this->approvedClaimFor($account, $thread->society_id)) {
            return response()->json(['message' => 'An approved RWA claim is required.'], 403);
        }
        $thread->update(['resolved_at' => now(), 'status' => 'approved']);

        return response()->json(['message' => 'RWA thread marked resolved.', 'data' => $thread->fresh()]);
    }
}
