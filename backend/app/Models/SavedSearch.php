<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class SavedSearch extends Model
{
    protected $fillable = [
        'account_id', 'anon_token', 'name', 'filters', 'alert_enabled', 'alert_channel',
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

    /** A brief recorded without anyone signing in — no account, no contact detail. */
    public function isAnonymous(): bool
    {
        return $this->account_id === null;
    }

    /**
     * Briefs, as opposed to saved property searches, which share this table.
     *
     * A JSON path comparison rather than whereJsonContains: the latter tests membership of
     * a JSON array, and `kind` is a plain string.
     */
    public function scopeBriefs($query)
    {
        return $query->where('filters->kind', 'brief');
    }

    public function alerts(): HasMany
    {
        return $this->hasMany(SavedSearchAlert::class);
    }
}
