<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\IntelligenceCorrection;
use App\Models\IntelligenceSource;
use App\Models\Society;
use App\Models\SocietyIntelligenceProfile;
use App\Services\SocietyIntelligenceScoringService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Validation\Rule;

class AdminSocietyIntelligenceController extends Controller
{
    public function show(Society $society): JsonResponse
    {
        $profile = $society->intelligenceProfile()->with('sources')->first()
            ?: $society->intelligenceProfile()->create(['intelligence_status' => SocietyIntelligenceProfile::STATUS_DRAFT]);

        return response()->json(['status' => 'ok', 'data' => $profile->fresh()->load('sources')]);
    }

    public function update(Request $request, Society $society): JsonResponse
    {
        $payload = $this->validatedProfilePayload($request);
        $profile = $society->intelligenceProfile()->firstOrCreate([], ['intelligence_status' => SocietyIntelligenceProfile::STATUS_DRAFT]);

        if (array_key_exists('score_override', $payload) && $payload['score_override'] !== null && empty($payload['score_override_reason'])) {
            return response()->json(['status' => 'error', 'message' => 'Score override requires an admin reason.'], 422);
        }

        if ($profile->intelligence_status === SocietyIntelligenceProfile::STATUS_PUBLISHED) {
            $payload['intelligence_status'] = SocietyIntelligenceProfile::STATUS_NEEDS_REVIEW;
            $payload['published_at'] = null;
        }

        $profile->update($payload);

        return response()->json(['status' => 'ok', 'data' => $profile->fresh()->load('sources')]);
    }

    public function recalculate(Society $society, SocietyIntelligenceScoringService $scoring): JsonResponse
    {
        $profile = $scoring->recalculate($society);

        return response()->json(['status' => 'ok', 'data' => $profile->load('sources')]);
    }

    public function approve(Request $request, Society $society): JsonResponse
    {
        $profile = $society->intelligenceProfile()->firstOrFail();

        if ((float) $profile->evidence_coverage_score < SocietyIntelligenceScoringService::MINIMUM_COVERAGE) {
            return response()->json(['status' => 'error', 'message' => 'Minimum evidence coverage is required before approval.'], 422);
        }

        $profile->update([
            'intelligence_status' => SocietyIntelligenceProfile::STATUS_APPROVED,
            'last_intelligence_reviewed_at' => now(),
            'intelligence_reviewed_by' => $request->user()?->email ?: 'admin',
            'published_at' => null,
        ]);

        return response()->json(['status' => 'ok', 'data' => $profile->fresh()]);
    }

    public function publish(Society $society): JsonResponse
    {
        $profile = $society->intelligenceProfile()->firstOrFail();

        if (! $society->is_published || ! in_array($society->status, ['Verified', 'Premium'], true)) {
            return response()->json(['status' => 'error', 'message' => 'Society must be public before intelligence can be published.'], 422);
        }

        if (! in_array($profile->intelligence_status, [SocietyIntelligenceProfile::STATUS_APPROVED, SocietyIntelligenceProfile::STATUS_PUBLISHED], true)) {
            return response()->json(['status' => 'error', 'message' => 'Intelligence must be approved before publishing.'], 422);
        }

        $profile->update([
            'intelligence_status' => SocietyIntelligenceProfile::STATUS_PUBLISHED,
            'published_at' => now(),
        ]);

        return response()->json(['status' => 'ok', 'data' => $profile->fresh()]);
    }

    public function unpublish(Society $society): JsonResponse
    {
        $profile = $society->intelligenceProfile()->firstOrFail();
        $profile->update([
            'intelligence_status' => SocietyIntelligenceProfile::STATUS_APPROVED,
            'published_at' => null,
        ]);

        return response()->json(['status' => 'ok', 'data' => $profile->fresh()]);
    }

    public function upsertSources(Request $request, Society $society): JsonResponse
    {
        $profile = $society->intelligenceProfile()->firstOrCreate([], ['intelligence_status' => SocietyIntelligenceProfile::STATUS_DRAFT]);
        $payload = $request->validate([
            'sources' => ['required', 'array', 'max:50'],
            'sources.*.id' => ['nullable', 'integer'],
            'sources.*.field_key' => ['required', 'string', 'max:120'],
            'sources.*.source_type' => ['required', 'string', 'max:80'],
            'sources.*.source_name' => ['required', 'string', 'max:180'],
            'sources.*.source_url' => ['nullable', 'url', 'max:1000'],
            'sources.*.source_date' => ['nullable', 'date'],
            'sources.*.retrieved_at' => ['nullable', 'date'],
            'sources.*.reviewed_at' => ['nullable', 'date'],
            'sources.*.verification_status' => ['required', 'string', 'max:80'],
            'sources.*.confidence_level' => ['required', Rule::in(['low', 'medium', 'high'])],
            'sources.*.evidence_excerpt' => ['nullable', 'string', 'max:1200'],
            'sources.*.public_note' => ['nullable', 'string', 'max:800'],
            'sources.*.attribution' => ['nullable', 'string', 'max:180'],
            'sources.*.is_public' => ['boolean'],
            'sources.*.status' => ['required', 'string', 'max:80'],
        ]);

        foreach ($payload['sources'] as $sourcePayload) {
            $id = Arr::pull($sourcePayload, 'id');
            $sourcePayload['reviewed_by'] = ! empty($sourcePayload['reviewed_at'])
                ? ($request->user()?->email ?: 'admin')
                : null;

            if ($id) {
                $profile->sources()->whereKey($id)->firstOrFail()->update($sourcePayload);
            } else {
                $profile->sources()->create($sourcePayload);
            }
        }

        return response()->json(['status' => 'ok', 'data' => $profile->fresh()->load('sources')]);
    }

    public function corrections(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'data' => IntelligenceCorrection::with('society:id,name,slug')->latest()->paginate((int) request()->integer('per_page', 50)),
        ]);
    }

    public function updateCorrection(Request $request, IntelligenceCorrection $correction): JsonResponse
    {
        $payload = $request->validate([
            'status' => ['required', Rule::in(['submitted', 'reviewing', 'accepted', 'rejected', 'disputed'])],
            'admin_resolution_note' => ['nullable', 'string', 'max:2000'],
        ]);

        $correction->update($payload + [
            'reviewed_by' => $request->user()?->email ?: 'admin',
            'reviewed_at' => now(),
        ]);

        return response()->json(['status' => 'ok', 'data' => $correction->fresh('society:id,name,slug')]);
    }

    private function validatedProfilePayload(Request $request): array
    {
        return $request->validate([
            'overall_score' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'overall_score_label' => ['nullable', 'string', 'max:120'],
            'score_override' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'score_override_reason' => ['nullable', 'string', 'max:1000'],
            'liveability_score' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'connectivity_score' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'construction_quality_score' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'maintenance_score' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'builder_reliability_score' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'price_value_score' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'rental_demand_score' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'resale_liquidity_score' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'safety_security_score' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'family_suitability_score' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'legal_rera_confidence_score' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'environmental_resilience_score' => ['nullable', 'numeric', 'min:0', 'max:10'],
            'best_for_json' => ['nullable', 'array'],
            'not_ideal_for_json' => ['nullable', 'array'],
            'top_strengths_json' => ['nullable', 'array'],
            'things_to_verify_json' => ['nullable', 'array'],
            'editorial_summary' => ['nullable', 'string', 'max:4000'],
            'score_explanation' => ['nullable', 'string', 'max:3000'],
            'data_confidence_score' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'data_completeness_score' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'intelligence_status' => ['nullable', Rule::in(['draft', 'needs_review', 'approved', 'archived'])],
        ]);
    }
}
