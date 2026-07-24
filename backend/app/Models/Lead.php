<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lead extends Model
{
    protected $fillable = [
        'property_id',
        'society_id',
        'region_id',
        'city_id',
        'zone_id',
        'locality_id',
        'name',
        'phone',
        'email',
        'budget',
        'property_title',
        'property_slug',
        'society_name',
        'message',
        'requirement',
        'source',
        'status',
        'priority',
        'assigned_to',
        'follow_up_at',
        'notes',
        'source_page',
        'page_url',
        'referrer',
        'cta_label',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'lead_intent',
        'search_query',
        'ai_query',
        'entity_type',
        'entity_slug',
        'target_city',
        'target_locality',
        'target_zone',
        'property_intent',
        'ncr_context',
    ];

    protected $casts = [
        'follow_up_at' => 'datetime',
        'ncr_context' => 'array',
    ];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function society(): BelongsTo
    {
        return $this->belongsTo(Society::class);
    }

    public function region(): BelongsTo
    {
        return $this->belongsTo(Region::class);
    }

    public function cityRecord(): BelongsTo
    {
        return $this->belongsTo(City::class, 'city_id');
    }

    public function zone(): BelongsTo
    {
        return $this->belongsTo(Zone::class);
    }

    public function localityRecord(): BelongsTo
    {
        return $this->belongsTo(Locality::class, 'locality_id');
    }

    public function linkedProperties(): HasMany
    {
        return $this->hasMany(Property::class, 'source_lead_id');
    }

    public function siteVisits(): HasMany
    {
        return $this->hasMany(SiteVisit::class);
    }
}
