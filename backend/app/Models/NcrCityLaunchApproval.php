<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class NcrCityLaunchApproval extends Model
{
    protected $fillable = [
        'city_id',
        'city_slug',
        'status',
        'approved_for_indexing',
        'approved_for_sitemap',
        'approved_at',
        'revoked_at',
        'approved_by',
        'revoked_by',
        'approval_notes',
        'readiness_snapshot',
    ];

    protected $casts = [
        'approved_for_indexing' => 'boolean',
        'approved_for_sitemap' => 'boolean',
        'approved_at' => 'datetime',
        'revoked_at' => 'datetime',
        'readiness_snapshot' => 'array',
    ];

    public function city(): BelongsTo
    {
        return $this->belongsTo(City::class);
    }
}
