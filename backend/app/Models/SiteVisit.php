<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SiteVisit extends Model
{
    protected $fillable = [
        'lead_id', 'society_id', 'property_id', 'confirmation_token', 'proposed_slots',
        'selected_slot', 'status', 'visitor_name', 'visitor_phone', 'notes',
        'reminder_sent_at', 'created_by',
    ];

    protected $casts = [
        'proposed_slots' => 'array',
        'selected_slot' => 'datetime',
        'reminder_sent_at' => 'datetime',
    ];

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function society(): BelongsTo
    {
        return $this->belongsTo(Society::class);
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }
}
