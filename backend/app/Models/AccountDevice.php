<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountDevice extends Model
{
    protected $fillable = [
        'account_id',
        'device_id',
        'platform',
        'expo_push_token',
        'saved_search_alerts',
        'site_visit_reminders',
        'owner_listing_updates',
        'quiet_hours_enabled',
        'quiet_hours_start',
        'quiet_hours_end',
        'timezone',
        'last_registered_at',
        'disabled_at',
        'meta',
    ];

    protected $hidden = [
        'expo_push_token',
    ];

    protected $casts = [
        'expo_push_token' => 'encrypted',
        'saved_search_alerts' => 'boolean',
        'site_visit_reminders' => 'boolean',
        'owner_listing_updates' => 'boolean',
        'quiet_hours_enabled' => 'boolean',
        'last_registered_at' => 'datetime',
        'disabled_at' => 'datetime',
        'meta' => 'array',
    ];

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
