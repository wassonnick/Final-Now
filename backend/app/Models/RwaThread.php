<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class RwaThread extends Model
{
    protected $fillable = ['society_id', 'account_id', 'builder_claim_id', 'type', 'category', 'title', 'body', 'visibility', 'priority', 'status', 'reply_count', 'published_at', 'resolved_at', 'moderation_notes', 'metadata'];

    protected $casts = ['metadata' => 'array', 'published_at' => 'datetime', 'resolved_at' => 'datetime'];

    public function society(): BelongsTo
    {
        return $this->belongsTo(Society::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function claim(): BelongsTo
    {
        return $this->belongsTo(BuilderClaim::class, 'builder_claim_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(RwaReply::class);
    }
}
