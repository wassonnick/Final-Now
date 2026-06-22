<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SavedSearch extends Model
{
    protected $fillable = [
        'account_id', 'name', 'filters', 'alert_enabled', 'alert_channel',
        'alert_frequency', 'last_alert_sent_at', 'last_checked_at',
    ];

    protected $casts = [
        'filters' => 'array',
        'alert_enabled' => 'boolean',
        'last_alert_sent_at' => 'datetime',
        'last_checked_at' => 'datetime',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function alerts(): HasMany
    {
        return $this->hasMany(SavedSearchAlert::class);
    }
}
