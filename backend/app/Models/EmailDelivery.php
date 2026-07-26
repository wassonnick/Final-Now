<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmailDelivery extends Model
{
    protected $fillable = [
        'message_type',
        'recipient_masked',
        'related_type',
        'related_id',
        'provider',
        'provider_message_id',
        'status',
        'http_status',
        'failure_reason',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];
}
