<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IntelligenceCorrection;
use App\Models\Society;
use App\Models\SocietyIntelligenceProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SocietyIntelligenceController extends Controller
{
    public function show(string $slug): JsonResponse
    {
        $society = $this->publicSociety($slug);
        if (! $society) {
            return response()->json(['status' => 'error', 'message' => 'Society not found'], 404);
        }

        $profile = $society->intelligenceProfile()
            ->published()
            ->with(['sources' => fn ($query) => $query->public()])
            ->first();

        if (! $profile) {
            return response()->json([
                'status' => 'ok',
                'data' => null,
                'message' => 'Detailed intelligence review in progress.',
            ]);
        }

        return response()->json([
            'status' => 'ok',
            'data' => $this->publicProfilePayload($profile),
        ]);
    }

    public function sources(string $slug): JsonResponse
    {
        $society = $this->publicSociety($slug);
        if (! $society) {
            return response()->json(['status' => 'error', 'message' => 'Society not found'], 404);
        }

        $profile = $society->intelligenceProfile()->published()->first();

        return response()->json([
            'status' => 'ok',
            'data' => $profile
                ? $profile->sources()->public()->latest()->get()->map(fn ($source) => $this->publicSourcePayload($source))->values()
                : [],
        ]);
    }

    public function compare(Request $request): JsonResponse
    {
        $slugs = collect(explode(',', (string) $request->query('slugs', '')))
            ->map(fn ($slug) => trim($slug))
            ->filter()
            ->unique()
            ->take(3)
            ->values();

        $societies = Society::query()
            ->whereIn('slug', $slugs)
            ->where('is_published', true)
            ->whereIn('status', ['Verified', 'Premium'])
            ->with(['intelligenceProfile' => fn ($query) => $query
                ->published()
                ->with(['sources' => fn ($sourceQuery) => $sourceQuery->public()])])
            ->get();

        return response()->json([
            'status' => 'ok',
            'data' => $societies->map(fn (Society $society) => [
                'society' => [
                    'id' => $society->id,
                    'name' => $society->name,
                    'slug' => $society->slug,
                    'sector' => $society->sector,
                    'locality' => $society->locality,
                    'builder' => $society->builder,
                ],
                'intelligence' => $society->intelligenceProfile
                    ? $this->publicProfilePayload($society->intelligenceProfile)
                    : null,
            ])->values(),
        ]);
    }

    public function storeCorrection(Request $request): JsonResponse
    {
        $payload = $request->validate([
            'society_id' => ['nullable', 'integer', 'exists:societies,id'],
            'society_name' => ['nullable', 'string', 'max:180'],
            'information_key' => ['nullable', 'string', 'max:120'],
            'information_challenged' => ['required', 'string', 'max:1500'],
            'suggested_correction' => ['required', 'string', 'max:2000'],
            'supporting_url' => ['nullable', 'url', 'max:1000'],
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:180'],
            'phone' => ['nullable', 'string', 'max:40'],
            'relationship_to_society' => ['nullable', 'string', 'max:120'],
            'consent' => ['accepted'],
        ]);

        $correction = IntelligenceCorrection::create($payload + ['status' => 'submitted']);

        return response()->json([
            'status' => 'ok',
            'message' => 'Correction submitted for admin review.',
            'data' => ['id' => $correction->id, 'status' => $correction->status],
        ], 201);
    }

    private function publicSociety(string $slug): ?Society
    {
        return Society::query()
            ->where('slug', $slug)
            ->where('is_published', true)
            ->whereIn('status', ['Verified', 'Premium'])
            ->first();
    }

    private function publicProfilePayload(SocietyIntelligenceProfile $profile): array
    {
        $sources = $profile->relationLoaded('sources')
            ? $profile->sources
            : $profile->sources()->public()->latest()->get();

        return [
            'id' => $profile->id,
            'society_id' => $profile->society_id,
            'overall_score' => $profile->overall_score,
            'overall_score_label' => $profile->overall_score_label,
            'score_version' => $profile->score_version,
            'score_calculated_at' => $profile->score_calculated_at,
            // The receipts behind the headline number: every weighted signal, its score,
            // its share of the total, and whether it's verified or still estimated.
            'signal_breakdown' => \App\Services\SocietyIntelligenceScoringService::publicSignalBreakdown($profile->score_inputs_json),
            'best_for_json' => $profile->best_for_json ?: [],
            'not_ideal_for_json' => $profile->not_ideal_for_json ?: [],
            'top_strengths_json' => collect($profile->top_strengths_json ?: [])->where('status', 'published')->values()->all(),
            'things_to_verify_json' => collect($profile->things_to_verify_json ?: [])->where('public', true)->where('status', 'published')->values()->all(),
            'editorial_summary' => $profile->editorial_summary,
            'score_explanation' => $profile->score_explanation,
            'data_confidence_score' => $profile->data_confidence_score,
            'data_completeness_score' => $profile->data_completeness_score,
            'evidence_coverage_score' => $profile->evidence_coverage_score,
            'last_intelligence_reviewed_at' => $profile->last_intelligence_reviewed_at,
            'freshness_label' => $this->freshnessLabel($profile->last_intelligence_reviewed_at ?: $profile->updated_at),
            'sources' => $sources->map(fn ($source) => $this->publicSourcePayload($source))->values(),
        ];
    }

    private function publicSourcePayload($source): array
    {
        return [
            'field_key' => $source->field_key,
            'source_type' => $source->source_type,
            'source_name' => $source->source_name,
            'source_url' => $source->source_url,
            'source_date' => $source->source_date,
            'reviewed_at' => $source->reviewed_at,
            'verification_status' => $source->verification_status,
            'confidence_level' => $source->confidence_level,
            'public_note' => $source->public_note,
            'attribution' => $source->attribution,
        ];
    }

    private function freshnessLabel($date): string
    {
        if (! $date) return 'Not yet verified';
        $days = now()->diffInDays($date);

        return match (true) {
            $days <= 30 => 'Updated within 30 days',
            $days <= 90 => 'Updated within 90 days',
            $days <= 365 => 'Review recommended',
            default => 'Historical information',
        };
    }
}
