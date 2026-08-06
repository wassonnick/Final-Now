<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketRefreshLog extends Model
{
    protected $fillable = ['society_id', 'trigger', 'applied', 'before', 'after', 'changed_fields', 'sources', 'confidence', 'notes'];

    protected $casts = [
        'applied' => 'boolean',
        'before' => 'array',
        'after' => 'array',
        'changed_fields' => 'array',
        'sources' => 'array',
        'confidence' => 'integer',
    ];

    public function society(): BelongsTo
    {
        return $this->belongsTo(Society::class);
    }
}
