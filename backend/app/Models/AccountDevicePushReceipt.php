<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AccountDevicePushReceipt extends Model
{
    protected $fillable = [
        'account_device_id',
        'account_id',
        'event',
        'expo_ticket_id',
        'status',
        'error_code',
        'error_message',
        'sent_at',
        'receipt_checked_at',
        'meta',
    ];

    protected $casts = [
        'sent_at' => 'datetime',
        'receipt_checked_at' => 'datetime',
        'meta' => 'array',
    ];

    public function accountDevice(): BelongsTo
    {
        return $this->belongsTo(AccountDevice::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
