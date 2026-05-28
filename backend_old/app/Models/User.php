<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Relations\HasMany;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, HasUuids, Notifiable;

    protected $table = 'users';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'email', 'phone', 'password_hash', 'first_name', 'last_name', 'avatar_url',
        'user_type', 'email_verified', 'phone_verified', 'kyc_status', 'kyc_documents',
        'search_preferences', 'notification_settings', 'is_active', 'last_login_at'
    ];

    protected $hidden = ['password_hash'];

    protected $casts = [
        'email_verified' => 'boolean',
        'phone_verified' => 'boolean',
        'is_active' => 'boolean',
        'kyc_documents' => 'array',
        'search_preferences' => 'array',
        'notification_settings' => 'array',
        'last_login_at' => 'datetime',
    ];

    public function getAuthPassword(): string
    {
        return (string) $this->password_hash;
    }

    public function ownedProperties(): HasMany
    {
        return $this->hasMany(Property::class, 'owner_id');
    }

    public function brokerProperties(): HasMany
    {
        return $this->hasMany(Property::class, 'broker_id');
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    public function isAdmin(): bool
    {
        return in_array($this->user_type, ['admin', 'super_admin', 'moderator'], true);
    }
}
