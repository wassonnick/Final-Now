<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OpsDigest extends Model
{
    protected $fillable = ['digest_date', 'payload'];

    protected $casts = [
        'digest_date' => 'date',
        'payload' => 'array',
    ];
}
