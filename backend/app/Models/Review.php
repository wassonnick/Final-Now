<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Review extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'reviews';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'society_id', 'user_id', 'rating', 'title', 'content', 'security_rating',
        'maintenance_rating', 'amenities_rating', 'connectivity_rating', 'management_rating',
        'value_for_money_rating', 'lived_duration_months', 'property_type', 'bhk',
        'floor_number', 'pros', 'cons', 'is_verified_resident', 'verification_proof',
        'status', 'moderation_notes', 'helpful_count', 'reported_count'
    ];

    protected $casts = [
        'pros' => 'array',
        'cons' => 'array',
        'verification_proof' => 'array',
        'is_verified_resident' => 'boolean',
        'rating' => 'decimal:1',
    ];

    public function society(): BelongsTo
    {
        return $this->belongsTo(Society::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function helpfulVotes(): HasMany
    {
        return $this->hasMany(ReviewHelpfulVote::class);
    }
}
