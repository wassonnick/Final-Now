<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class IntelligenceSource extends Model
{
    protected $fillable = [
        'sourceable_type',
        'sourceable_id',
        'field_key',
        'source_type',
        'source_name',
        'source_url',
        'source_date',
        'retrieved_at',
        'reviewed_at',
        'reviewed_by',
        'verification_status',
        'confidence_level',
        'evidence_excerpt',
        'public_note',
        'attribution',
        'is_public',
        'status',
    ];

    protected $casts = [
        'source_date' => 'date',
        'retrieved_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'is_public' => 'boolean',
    ];

    public function sourceable(): MorphTo
    {
        return $this->morphTo();
    }

    public function scopePublic($query)
    {
        return $query->where('is_public', true)->whereIn('verification_status', ['admin_reviewed', 'verified', 'source_found']);
    }
}
