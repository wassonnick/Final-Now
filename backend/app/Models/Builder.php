<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Builder extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'builders';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'name', 'slug', 'logo_url', 'established_year', 'headquarters', 'website',
        'description', 'total_projects', 'total_delivered', 'reputation_score', 'rera_registered'
    ];

    protected $casts = [
        'rera_registered' => 'boolean',
        'reputation_score' => 'decimal:2',
    ];

    public function societies(): HasMany
    {
        return $this->hasMany(Society::class);
    }
}
