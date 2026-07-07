<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RwaReply extends Model
{
    protected $fillable = ['rwa_thread_id', 'account_id', 'builder_claim_id', 'body', 'status', 'is_official', 'published_at', 'moderation_notes'];

    protected $casts = ['is_official' => 'boolean', 'published_at' => 'datetime'];

    public function thread(): BelongsTo
    {
        return $this->belongsTo(RwaThread::class, 'rwa_thread_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function claim(): BelongsTo
    {
        return $this->belongsTo(BuilderClaim::class, 'builder_claim_id');
    }
}
