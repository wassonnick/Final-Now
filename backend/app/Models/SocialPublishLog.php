<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocialPublishLog extends Model
{
    protected $fillable = [
        'social_post_id',
        'social_account_id',
        'platform',
        'action',
        'status',
        'actor',
        'external_post_id',
        'message',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function post(): BelongsTo
    {
        return $this->belongsTo(SocialPost::class, 'social_post_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(SocialAccount::class, 'social_account_id');
    }
}
