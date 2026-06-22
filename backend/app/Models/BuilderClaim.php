<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BuilderClaim extends Model
{
    protected $fillable = ['account_id', 'society_id', 'organisation_name', 'representative_name', 'representative_role', 'phone', 'email', 'proof_notes', 'status', 'review_notes', 'reviewed_at'];

    protected $casts = ['reviewed_at' => 'datetime'];

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function society(): BelongsTo
    {
        return $this->belongsTo(Society::class);
    }

    public function announcements(): HasMany
    {
        return $this->hasMany(SocietyAnnouncement::class);
    }
}
