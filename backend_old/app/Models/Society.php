<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Society extends Model
{
    use HasFactory;

    protected $table = 'societies';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'name', 'slug', 'builder_id', 'locality_id', 'address',
        'total_towers', 'total_units', 'possession_year', 'construction_status',
        'security_score', 'maintenance_score', 'amenities_score',
        'connectivity_score', 'family_friendly_score', 'pet_friendly_score',
        'construction_quality_score', 'rental_demand_score', 'overall_score',
        'security_features', 'amenities', 'maintenance_details',
        'rules_regulations', 'nearby_facilities',
        'cover_image', 'gallery_images', 'video_tour_url',
        'meta_title', 'meta_description', 'content_html', 'faqs',
        'is_verified', 'verification_status', 'featured', 'sponsored', 'status',
        'view_count', 'lead_count', 'review_count', 'avg_rating'
    ];

    protected $casts = [
        'security_features' => 'array',
        'amenities' => 'array',
        'maintenance_details' => 'array',
        'rules_regulations' => 'array',
        'nearby_facilities' => 'array',
        'gallery_images' => 'array',
        'faqs' => 'array',
        'is_verified' => 'boolean',
        'featured' => 'boolean',
        'sponsored' => 'boolean',
        'security_score' => 'decimal:2',
        'maintenance_score' => 'decimal:2',
        'amenities_score' => 'decimal:2',
        'connectivity_score' => 'decimal:2',
        'family_friendly_score' => 'decimal:2',
        'pet_friendly_score' => 'decimal:2',
        'construction_quality_score' => 'decimal:2',
        'rental_demand_score' => 'decimal:2',
        'overall_score' => 'decimal:2',
        'avg_rating' => 'decimal:1',
    ];

    public function builder(): BelongsTo
    {
        return $this->belongsTo(Builder::class);
    }

    public function locality(): BelongsTo
    {
        return $this->belongsTo(Locality::class);
    }

    public function properties(): HasMany
    {
        return $this->hasMany(Property::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class)->where('status', 'approved');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeVerified($query)
    {
        return $query->where('is_verified', true);
    }

    public function scopeFeatured($query)
    {
        return $query->where('featured', true);
    }

    public function scopeInLocality($query, $localityId)
    {
        return $query->where('locality_id', $localityId);
    }

    public function scopeMinScore($query, $score)
    {
        return $query->where('overall_score', '>=', $score);
    }

    public function getScoreBreakdownAttribute(): array
    {
        return [
            'security' => $this->security_score,
            'maintenance' => $this->maintenance_score,
            'amenities' => $this->amenities_score,
            'connectivity' => $this->connectivity_score,
            'family_friendly' => $this->family_friendly_score,
            'pet_friendly' => $this->pet_friendly_score,
            'construction_quality' => $this->construction_quality_score,
            'rental_demand' => $this->rental_demand_score,
        ];
    }

    public function getIntelligenceSummaryAttribute(): array
    {
        return [
            'overall_score' => $this->overall_score,
            'grade' => $this->calculateGrade(),
            'verdict' => $this->generateVerdict(),
            'strengths' => $this->identifyStrengths(),
            'weaknesses' => $this->identifyWeaknesses(),
        ];
    }

    private function calculateGrade(): string
    {
        $score = $this->overall_score;
        if ($score >= 90) return 'A+';
        if ($score >= 85) return 'A';
        if ($score >= 80) return 'A-';
        if ($score >= 75) return 'B+';
        if ($score >= 70) return 'B';
        if ($score >= 65) return 'B-';
        if ($score >= 60) return 'C+';
        return 'C';
    }

    private function generateVerdict(): string
    {
        $score = $this->overall_score;
        if ($score >= 90) return 'Exceptional society. Highly recommended for premium renters.';
        if ($score >= 80) return 'Excellent society with strong fundamentals. Great choice.';
        if ($score >= 70) return 'Good society with some areas for improvement. Worth considering.';
        return 'Average society. Evaluate carefully before deciding.';
    }

    private function identifyStrengths(): array
    {
        $scores = $this->score_breakdown;
        arsort($scores);
        $strengths = [];
        foreach (array_slice($scores, 0, 3, true) as $key => $value) {
            if ($value >= 85) {
                $strengths[] = [
                    'category' => $key,
                    'score' => $value,
                    'label' => ucwords(str_replace('_', ' ', $key))
                ];
            }
        }
        return $strengths;
    }

    private function identifyWeaknesses(): array
    {
        $scores = $this->score_breakdown;
        asort($scores);
        $weaknesses = [];
        foreach (array_slice($scores, 0, 2, true) as $key => $value) {
            if ($value < 75) {
                $weaknesses[] = [
                    'category' => $key,
                    'score' => $value,
                    'label' => ucwords(str_replace('_', ' ', $key))
                ];
            }
        }
        return $weaknesses;
    }
}
