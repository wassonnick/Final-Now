<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NriCase extends Model
{
    protected $fillable = [
        'name', 'country', 'contact_method', 'phone', 'email', 'service_type',
        'property_context', 'notes', 'status', 'assigned_to', 'follow_up_at',
        'admin_notes', 'consent_at',
    ];

    protected $casts = [
        'follow_up_at' => 'datetime',
        'consent_at' => 'datetime',
    ];
}
