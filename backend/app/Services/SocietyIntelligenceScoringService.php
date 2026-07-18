<?php

namespace App\Services;

use App\Models\Society;
use App\Models\SocietyIntelligenceProfile;

class SocietyIntelligenceScoringService
{
    public const VERSION = 'c117-v1';
    public const MINIMUM_COVERAGE = 60.0;

    private const WEIGHTS = [
        'liveability_score' => 20,
        'connectivity_score' => 15,
        'maintenance_score' => 10,
        'builder_reliability_score' => 10,
        'price_value_score' => 10,
        'rental_demand_score' => 10,
        'resale_liquidity_score' => 10,
        'safety_security_score' => 5,
        'legal_rera_confidence_score' => 5,
        'environmental_resilience_score' => 5,
    ];

    /** Human labels for each weighted signal — used in the public "Why this score" breakdown. */
    private const LABELS = [
        'liveability_score' => 'Everyday liveability',
        'connectivity_score' => 'Connectivity & commute',
        'maintenance_score' => 'Upkeep & maintenance',
        'builder_reliability_score' => 'Builder track record',
        'price_value_score' => 'Price for what you get',
        'rental_demand_score' => 'Rental demand',
        'resale_liquidity_score' => 'Resale liquidity',
        'safety_security_score' => 'Safety & security',
        'legal_rera_confidence_score' => 'Legal & RERA confidence',
        'environmental_resilience_score' => 'Environment & resilience',
    ];

    /**
     * Turn the internal score_inputs_json into a public, labelled breakdown — one row per
     * weighted signal with its score, weight (% of the total), verification status and a
     * plain-English source. This is the "receipts" behind the headline score: every signal
     * shown, missing ones flagged rather than hidden.
     *
     * @param  array<string,mixed>  $inputs
     * @return array<int,array<string,mixed>>
     */
    public static function publicSignalBreakdown(?array $inputs): array
    {
        $inputs ??= [];
        $rows = [];
        foreach (self::WEIGHTS as $field => $weight) {
            $input = $inputs[$field] ?? [];
            $rows[] = [
                'key' => $field,
                'label' => self::LABELS[$field] ?? ucwords(str_replace('_', ' ', $field)),
                'weight' => $weight,
                'score' => $input['score'] ?? null,
                'status' => $input['score'] ?? null ? ($input['status'] ?? 'estimated') : 'missing',
                'source' => self::sourceLabel($input['source'] ?? null),
            ];
        }

        return $rows;
    }

    private static function sourceLabel(?string $source): string
    {
        return match ($source) {
            'admin_entered' => 'Admin-verified',
            'lifestyle_score', 'connectivity_score', 'security_score', 'maintenance_score' => 'Scored from checked location & society data',
            'builder_present' => 'Builder record',
            'price_context', 'rent_context', 'resale_context' => 'Market range context',
            'rera_context' => 'RERA record',
            'environmental_context' => 'Awaiting environmental data',
            null, '' => 'Not yet sourced',
            default => 'Reviewed data',
        };
    }

    public function calculate(Society $society, ?SocietyIntelligenceProfile $profile = null): array
    {
        $profile ??= $society->intelligenceProfile;
        $components = $this->componentScores($society, $profile);
        $availableWeight = 0;
        $weightedScore = 0.0;
        $inputs = [];

        foreach (self::WEIGHTS as $field => $weight) {
            $value = $components[$field]['score'];
            $inputs[$field] = $components[$field];

            if ($value === null) {
                continue;
            }

            $availableWeight += $weight;
            $weightedScore += $value * $weight;
        }

        $coverage = round($availableWeight, 2);
        $overall = $coverage >= self::MINIMUM_COVERAGE && $availableWeight > 0
            ? round($weightedScore / $availableWeight, 1)
            : null;

        if ($profile?->score_override !== null && $profile?->score_override_reason) {
            $overall = round((float) $profile->score_override, 1);
            $inputs['manual_override'] = [
                'score' => $overall,
                'reason' => $profile->score_override_reason,
                'source' => 'admin_override',
            ];
        }

        $verified = collect($inputs)->filter(fn ($input) => ($input['status'] ?? '') === 'verified')->count();
        $estimated = collect($inputs)->filter(fn ($input) => ($input['status'] ?? '') === 'estimated')->count();
        $unverified = collect($inputs)->filter(fn ($input) => ($input['score'] ?? null) === null)->count();

        return [
            'overall_score' => $overall,
            'overall_score_label' => $overall === null ? 'Insufficient verified data' : $this->scoreLabel($overall),
            'score_version' => self::VERSION,
            'score_calculated_at' => now(),
            'score_inputs_json' => $inputs,
            'data_confidence_score' => $this->confidenceScore($society, $profile, $coverage),
            'data_completeness_score' => $coverage,
            'verified_field_count' => $verified,
            'estimated_field_count' => $estimated,
            'unverified_field_count' => $unverified,
            'evidence_coverage_score' => $coverage,
            'score_explanation' => $overall === null
                ? 'SocietyFlats has not yet verified enough weighted evidence to show an overall intelligence score.'
                : 'Score calculated from verified weighted components. Missing components are excluded and weights are renormalized only after minimum evidence coverage is met.',
        ];
    }

    public function recalculate(Society $society): SocietyIntelligenceProfile
    {
        $profile = $society->intelligenceProfile ?: $society->intelligenceProfile()->create([
            'intelligence_status' => SocietyIntelligenceProfile::STATUS_DRAFT,
        ]);

        $profile->update($this->calculate($society, $profile) + [
            'intelligence_status' => $profile->intelligence_status === SocietyIntelligenceProfile::STATUS_PUBLISHED
                ? SocietyIntelligenceProfile::STATUS_NEEDS_REVIEW
                : $profile->intelligence_status,
            'published_at' => $profile->intelligence_status === SocietyIntelligenceProfile::STATUS_PUBLISHED ? null : $profile->published_at,
        ]);

        return $profile->fresh();
    }

    private function componentScores(Society $society, ?SocietyIntelligenceProfile $profile): array
    {
        return [
            'liveability_score' => $this->scoreFrom($profile?->liveability_score, $society->lifestyle_score, 'lifestyle_score'),
            'connectivity_score' => $this->scoreFrom($profile?->connectivity_score, $society->connectivity_score, 'connectivity_score'),
            'maintenance_score' => $this->scoreFrom($profile?->maintenance_score, $society->maintenance_score, 'maintenance_score'),
            'builder_reliability_score' => $this->scoreFrom($profile?->builder_reliability_score, $society->builder ? 7.0 : null, 'builder_present', $society->builder ? 'estimated' : 'missing'),
            'price_value_score' => $this->scoreFrom($profile?->price_value_score, $society->price_per_sqft || $society->buy_range ? $society->investment_score : null, 'price_context'),
            'rental_demand_score' => $this->scoreFrom($profile?->rental_demand_score, $society->rent_range ? $society->investment_score : null, 'rent_context'),
            'resale_liquidity_score' => $this->scoreFrom($profile?->resale_liquidity_score, $society->buy_range ? $society->investment_score : null, 'resale_context'),
            'safety_security_score' => $this->scoreFrom($profile?->safety_security_score, $society->security_score, 'security_score'),
            'legal_rera_confidence_score' => $this->scoreFrom($profile?->legal_rera_confidence_score, $society->rera_number || $society->rera_status ? 7.0 : null, 'rera_context', $society->rera_number || $society->rera_status ? 'estimated' : 'missing'),
            'environmental_resilience_score' => $this->scoreFrom($profile?->environmental_resilience_score, null, 'environmental_context'),
        ];
    }

    private function scoreFrom(mixed $manual, mixed $fallback, string $source, string $status = 'verified'): array
    {
        $value = $manual !== null && $manual !== '' ? $manual : $fallback;
        $score = $this->normalScore($value);

        return [
            'score' => $score,
            'source' => $manual !== null && $manual !== '' ? 'admin_entered' : $source,
            'status' => $score === null ? 'missing' : $status,
        ];
    }

    private function normalScore(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        $score = (float) $value;
        if (! is_finite($score) || $score <= 0) {
            return null;
        }

        if ($score > 10 && $score <= 100) {
            $score = $score / 10;
        }

        return round(max(0, min(10, $score)), 1);
    }

    private function scoreLabel(float $score): string
    {
        return match (true) {
            $score >= 8.5 => 'Exceptional society match',
            $score >= 7.5 => 'Very strong society match',
            $score >= 6.5 => 'Strong society match',
            $score >= 5.5 => 'Good with checks',
            default => 'Needs careful review',
        };
    }

    private function confidenceScore(Society $society, ?SocietyIntelligenceProfile $profile, float $coverage): float
    {
        $sourceConfidence = (float) ($society->source_confidence_score ?: 0);
        $profileConfidence = (float) ($profile?->data_confidence_score ?: 0);
        $raw = max($sourceConfidence, $profileConfidence, $coverage);

        return round(max(0, min(100, $raw)), 2);
    }
}
