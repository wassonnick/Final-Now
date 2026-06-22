<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ReviewResponse extends Model
{
    protected $fillable = ['review_id', 'builder_claim_id', 'account_id', 'content', 'status', 'moderation_notes', 'published_at'];

    protected $hidden = ['account_id', 'moderation_notes'];

    protected $casts = ['published_at' => 'datetime'];

    public function review(): BelongsTo
    {
        return $this->belongsTo(Review::class);
    }

    public function claim(): BelongsTo
    {
        return $this->belongsTo(BuilderClaim::class, 'builder_claim_id');
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }
}
