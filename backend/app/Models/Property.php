<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Property extends Model
{
    protected $fillable = [
        'society_id',
        'source_lead_id',
        'owner_name',
        'owner_phone',
        'owner_verification_status',
        'owner_notes',
        'title',
        'slug',
        'listing_type',
        'status',
        'society',
        'locality',
        'price',
        'security_deposit',
        'maintenance',
        'bedrooms',
        'bathrooms',
        'area_sqft',
        'floor',
        'facing',
        'furnished_status',
        'description',
        'amenities',
        'images',
        'virtual_tour_url',
        'floor_plan_url',
        'featured',
        'verified',
        'verified_at',
        'availability_checked_at',
        'published_at',
    ];

    protected $casts = [
        'amenities' => 'array',
        'images' => 'array',
        'featured' => 'boolean',
        'verified' => 'boolean',
        'verified_at' => 'datetime',
        'availability_checked_at' => 'datetime',
        'published_at' => 'datetime',
    ];

    public function scopePubliclyAvailable(Builder $query): Builder
    {
        return $query
            ->where('status', 'Live')
            ->where('verified', true)
            ->whereNotNull('verified_at')
            ->whereNotNull('availability_checked_at')
            ->whereNotNull('published_at')
            ->whereHas('society', fn (Builder $society) => $society
                ->where('is_published', true)
                ->whereIn('status', ['Verified', 'Premium']));
    }

    public function society(): BelongsTo
    {
        return $this->belongsTo(Society::class);
    }

    public function sourceLead(): BelongsTo
    {
        return $this->belongsTo(Lead::class, 'source_lead_id');
    }

    public function leads(): HasMany
    {
        return $this->hasMany(Lead::class);
    }

    public function savedSearchAlerts(): HasMany
    {
        return $this->hasMany(SavedSearchAlert::class);
    }
}
