<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Lead extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'leads';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'property_id', 'society_id', 'source', 'tenant_name', 'tenant_email', 'tenant_phone',
        'tenant_user_id', 'budget_min', 'budget_max', 'preferred_move_in', 'requirements_notes',
        'status', 'assigned_to_owner_id', 'assigned_to_broker_id', 'next_follow_up_at',
        'follow_up_count', 'response_time_minutes', 'conversion_value'
    ];

    protected $casts = [
        'preferred_move_in' => 'date',
        'next_follow_up_at' => 'datetime',
    ];

    public function property(): BelongsTo
    {
        return $this->belongsTo(Property::class);
    }

    public function society(): BelongsTo
    {
        return $this->belongsTo(Society::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(LeadActivity::class)->latest();
    }
}
