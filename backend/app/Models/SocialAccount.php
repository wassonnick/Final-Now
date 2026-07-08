<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class SocialAccount extends Model
{
    protected $fillable = [
        'platform',
        'account_name',
        'account_handle',
        'account_id',
        'status',
        'access_token_encrypted',
        'refresh_token_encrypted',
        'token_expires_at',
        'scopes',
        'metadata',
    ];

    protected $hidden = [
        'access_token_encrypted',
        'refresh_token_encrypted',
    ];

    protected $casts = [
        'token_expires_at' => 'datetime',
        'scopes' => 'array',
        'metadata' => 'array',
    ];

    public function setAccessTokenAttribute(?string $value): void
    {
        $this->attributes['access_token_encrypted'] = $value ? Crypt::encryptString($value) : null;
    }

    public function setRefreshTokenAttribute(?string $value): void
    {
        $this->attributes['refresh_token_encrypted'] = $value ? Crypt::encryptString($value) : null;
    }
}
