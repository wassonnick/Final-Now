<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OwnerListing extends Model
{
    public const STATUSES = ['submitted', 'under_review', 'approved', 'rejected', 'converted'];

    protected $fillable = [
        'account_id', 'name', 'phone', 'purpose', 'listing_type', 'society_id', 'society_name',
        'locality', 'sector', 'city', 'tower', 'bhk', 'size_sqft', 'floor', 'furnishing',
        'availability', 'expected_price', 'rent_amount', 'sale_price', 'details',
        'property_amenities', 'inherited_society_amenities', 'images', 'status',
        'admin_notes', 'property_id',
    ];

    protected $casts = [
        'images' => 'array',
        'property_amenities' => 'array',
        'inherited_society_amenities' => 'array',
    ];

    public function society(): BelongsTo
    {
        return $this->belongsTo(Society::class);
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }
}
