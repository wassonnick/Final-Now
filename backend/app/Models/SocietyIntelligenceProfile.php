<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphMany;

class SocietyIntelligenceProfile extends Model
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_NEEDS_REVIEW = 'needs_review';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_PUBLISHED = 'published';
    public const STATUS_ARCHIVED = 'archived';

    protected $fillable = [
        'society_id',
        'overall_score',
        'overall_score_label',
        'score_version',
        'score_calculated_at',
        'score_override',
        'score_override_reason',
        'liveability_score',
        'connectivity_score',
        'construction_quality_score',
        'maintenance_score',
        'builder_reliability_score',
        'price_value_score',
        'rental_demand_score',
        'resale_liquidity_score',
        'safety_security_score',
        'family_suitability_score',
        'legal_rera_confidence_score',
        'environmental_resilience_score',
        'score_inputs_json',
        'best_for_json',
        'not_ideal_for_json',
        'top_strengths_json',
        'things_to_verify_json',
        'editorial_summary',
        'score_explanation',
        'data_confidence_score',
        'data_completeness_score',
        'verified_field_count',
        'estimated_field_count',
        'unverified_field_count',
        'evidence_coverage_score',
        'last_intelligence_reviewed_at',
        'intelligence_reviewed_by',
        'intelligence_status',
        'published_at',
    ];

    protected $casts = [
        'overall_score' => 'decimal:1',
        'score_override' => 'decimal:1',
        'liveability_score' => 'decimal:1',
        'connectivity_score' => 'decimal:1',
        'construction_quality_score' => 'decimal:1',
        'maintenance_score' => 'decimal:1',
        'builder_reliability_score' => 'decimal:1',
        'price_value_score' => 'decimal:1',
        'rental_demand_score' => 'decimal:1',
        'resale_liquidity_score' => 'decimal:1',
        'safety_security_score' => 'decimal:1',
        'family_suitability_score' => 'decimal:1',
        'legal_rera_confidence_score' => 'decimal:1',
        'environmental_resilience_score' => 'decimal:1',
        'score_inputs_json' => 'array',
        'best_for_json' => 'array',
        'not_ideal_for_json' => 'array',
        'top_strengths_json' => 'array',
        'things_to_verify_json' => 'array',
        'data_confidence_score' => 'decimal:2',
        'data_completeness_score' => 'decimal:2',
        'evidence_coverage_score' => 'decimal:2',
        'score_calculated_at' => 'datetime',
        'last_intelligence_reviewed_at' => 'datetime',
        'published_at' => 'datetime',
    ];

    public function society(): BelongsTo
    {
        return $this->belongsTo(Society::class);
    }

    public function sources(): MorphMany
    {
        return $this->morphMany(IntelligenceSource::class, 'sourceable');
    }

    public function scopePublished($query)
    {
        return $query->where('intelligence_status', self::STATUS_PUBLISHED)->whereNotNull('published_at');
    }
}
