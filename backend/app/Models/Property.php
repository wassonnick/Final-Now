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
        'source_type',
        'inventory_owner_type',
        'owner_account_id',
        'broker_account_id',
        'owner_listing_id',
        'submitted_by_user_id',
        'owner_name',
        'owner_phone',
        'owner_verification_status',
        'owner_notes',
        'title',
        'slug',
        'listing_type',
        'property_type',
        'status',
        'society',
        'locality',
        'sector',
        'city',
        'tower',
        'unit_number',
        'price',
        'rent_amount',
        'rent_unit',
        'sale_price',
        'sale_price_unit',
        'price_per_sqft',
        'security_deposit',
        'maintenance',
        'maintenance_included',
        'maintenance_amount',
        'maintenance_unit',
        'bedrooms',
        'bathrooms',
        'balconies',
        'area_sqft',
        'carpet_area_sqft',
        'floor',
        'facing',
        'furnished_status',
        'available_from',
        'description',
        'amenities',
        'inherited_society_amenities',
        'property_amenities',
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
        'inherited_society_amenities' => 'array',
        'property_amenities' => 'array',
        'images' => 'array',
        'featured' => 'boolean',
        'verified' => 'boolean',
        'maintenance_included' => 'boolean',
        'available_from' => 'date',
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

    public function ownerAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'owner_account_id');
    }

    public function brokerAccount(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'broker_account_id');
    }

    public function ownerListing(): BelongsTo
    {
        return $this->belongsTo(OwnerListing::class, 'owner_listing_id');
    }

    public function submittedByUser(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'submitted_by_user_id');
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
