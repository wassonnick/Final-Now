<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SocietyAnnouncement extends Model
{
    protected $fillable = ['builder_claim_id', 'society_id', 'title', 'category', 'content', 'status', 'published_at', 'expires_at', 'review_notes'];

    protected $casts = ['published_at' => 'datetime', 'expires_at' => 'datetime'];

    public function claim(): BelongsTo
    {
        return $this->belongsTo(BuilderClaim::class, 'builder_claim_id');
    }

    public function society(): BelongsTo
    {
        return $this->belongsTo(Society::class);
    }
}
