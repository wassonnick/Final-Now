<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OpsSuggestion extends Model
{
    public const KINDS = ['market_refresh', 'cover_photo'];
    public const STATUSES = ['pending', 'applied', 'dismissed'];

    protected $fillable = ['society_id', 'kind', 'status', 'payload', 'created_by', 'resolved_at'];

    protected $casts = [
        'payload' => 'array',
        'resolved_at' => 'datetime',
    ];

    public function society(): BelongsTo
    {
        return $this->belongsTo(Society::class);
    }
}
