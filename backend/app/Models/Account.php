<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Account extends Model
{
    use HasFactory;

    protected $fillable = [
        'role',
        'phone',
        'phone_normalized',
        'name',
        'email',
        'status',
        'last_login_at',
        'phone_verified_at',
        'meta',
        'api_token_hash',
        'api_token_created_at',
    ];

    protected $casts = [
        'last_login_at' => 'datetime',
        'api_token_created_at' => 'datetime',
        'phone_verified_at' => 'datetime',
        'meta' => 'array',
    ];

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function savedSearches(): HasMany
    {
        return $this->hasMany(SavedSearch::class);
    }
}
