<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Property extends Model
{
    use HasFactory;

    protected $table = 'properties';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'society_id', 'owner_id', 'broker_id', 'title', 'slug',
        'property_type', 'bhk', 'area_sqft', 'area_sqm',
        'rent_amount', 'maintenance_amount', 'deposit_months', 'negotiable',
        'floor_number', 'total_floors', 'facing', 'furnished_status',
        'bedrooms', 'bathrooms', 'balconies', 'parking_count',
        'features', 'appliances', 'photos', 'videos',
        'floor_plan_url', 'virtual_tour_url',
        'is_verified', 'verification_badges',
        'available_from', 'is_available', 'status', 'featured',
        'view_count', 'lead_count', 'shortlist_count'
    ];

    protected $casts = [
        'features' => 'array',
        'appliances' => 'array',
        'photos' => 'array',
        'videos' => 'array',
        'verification_badges' => 'array',
        'is_verified' => 'boolean',
        'negotiable' => 'boolean',
        'is_available' => 'boolean',
        'featured' => 'boolean',
        'available_from' => 'date',
    ];

    public function society(): BelongsTo
    {
        return $this->belongsTo(Society::class);
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function scopeActive($query)
    {
        return $query->where('status', 'active')->where('is_available', true);
    }

    public function scopeInBudget($query, $min, $max)
    {
        return $query->whereBetween('rent_amount', [$min, $max]);
    }

    public function scopeByBhk($query, $bhk)
    {
        return $query->where('bhk', $bhk);
    }

    public function scopeBySociety($query, $societyId)
    {
        return $query->where('society_id', $societyId);
    }

    public function getFormattedRentAttribute(): string
    {
        return '₹' . number_format($this->rent_amount) . '/month';
    }

    public function getDepositAmountAttribute(): int
    {
        return $this->rent_amount * $this->deposit_months;
    }

    public function getTotalMonthlyCostAttribute(): int
    {
        return $this->rent_amount + $this->maintenance_amount;
    }

    public function getPricePerSqftAttribute(): float
    {
        return $this->area_sqft > 0 ? round($this->rent_amount / $this->area_sqft, 2) : 0;
    }

    public function getFurnishedLabelAttribute(): string
    {
        return match($this->furnished_status) {
            'fully_furnished' => 'Fully Furnished',
            'semi_furnished' => 'Semi Furnished',
            default => 'Unfurnished'
        };
    }

    public function getVerificationStatusAttribute(): array
    {
        $badges = $this->verification_badges ?? [];
        return [
            'is_verified' => $this->is_verified,
            'badges' => $badges,
            'trust_score' => $this->calculateTrustScore(),
        ];
    }

    private function calculateTrustScore(): int
    {
        $score = $this->is_verified ? 40 : 0;
        $score += count($this->verification_badges ?? []) * 15;
        $score += ($this->society?->is_verified ?? false) ? 20 : 0;
        return min($score, 100);
    }
}
