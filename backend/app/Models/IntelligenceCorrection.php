<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntelligenceCorrection extends Model
{
    protected $fillable = [
        'society_id',
        'society_name',
        'information_key',
        'information_challenged',
        'suggested_correction',
        'supporting_url',
        'supporting_attachment',
        'name',
        'email',
        'phone',
        'relationship_to_society',
        'consent',
        'status',
        'admin_resolution_note',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'consent' => 'boolean',
        'reviewed_at' => 'datetime',
    ];

    public function society(): BelongsTo
    {
        return $this->belongsTo(Society::class);
    }
}
