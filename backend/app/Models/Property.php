<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
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
        'featured',
        'verified',
    ];

    protected $casts = [
        'amenities' => 'array',
        'images' => 'array',
        'featured' => 'boolean',
        'verified' => 'boolean',
    ];

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
}
