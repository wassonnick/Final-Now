<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AiUsageLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = [
        'provider',
        'feature',
        'operation',
        'model',
        'status',
        'input_tokens',
        'output_tokens',
        'total_tokens',
        'image_count',
        'estimated_cost_usd',
        'currency',
        'billable',
        'subject_type',
        'subject_id',
        'request_id',
        'error_class',
        'error_message',
        'metadata',
    ];

    protected $casts = [
        'input_tokens' => 'integer',
        'output_tokens' => 'integer',
        'total_tokens' => 'integer',
        'image_count' => 'integer',
        'estimated_cost_usd' => 'decimal:6',
        'billable' => 'boolean',
        'metadata' => 'array',
        'created_at' => 'datetime',
    ];
}
