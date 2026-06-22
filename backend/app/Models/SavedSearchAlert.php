<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SavedSearchAlert extends Model
{
    protected $fillable = ['saved_search_id', 'account_id', 'property_id', 'channel', 'status', 'sent_at', 'failure_reason', 'payload'];

    protected $casts = ['sent_at' => 'datetime', 'payload' => 'array'];

    public function savedSearch(): BelongsTo
    {
        return $this->belongsTo(SavedSearch::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }
}
