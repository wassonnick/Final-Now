<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Referral extends Model
{
    protected $fillable = [
        'referrer_account_id', 'referred_name', 'referred_phone', 'intent',
        'status', 'reward_status', 'notes', 'admin_notes',
        'qualified_at', 'converted_at', 'rewarded_at',
    ];

    protected $casts = [
        'qualified_at' => 'datetime',
        'converted_at' => 'datetime',
        'rewarded_at' => 'datetime',
    ];

    public function referrer(): BelongsTo
    {
        return $this->belongsTo(Account::class, 'referrer_account_id');
    }
}
