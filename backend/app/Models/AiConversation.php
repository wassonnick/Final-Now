<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiConversation extends Model
{
    protected $fillable = ['access_token_hash', 'status', 'model', 'last_message_at', 'expires_at'];

    protected $hidden = ['access_token_hash'];

    protected $casts = ['last_message_at' => 'datetime', 'expires_at' => 'datetime'];

    public function messages(): HasMany
    {
        return $this->hasMany(AiMessage::class);
    }
}
