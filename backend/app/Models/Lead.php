<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Lead extends Model
{
    protected $fillable = [
        'property_id',
        'society_id',
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
    ];

    protected $casts = [
        'follow_up_at' => 'datetime',
    ];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function society(): BelongsTo
    {
        return $this->belongsTo(Society::class);
    }
}
