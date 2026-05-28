<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Locality extends Model
{
    use HasFactory, HasUuids;

    protected $table = 'localities';
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'name', 'slug', 'city', 'state', 'pincode', 'latitude', 'longitude',
        'description', 'connectivity_score', 'safety_score', 'lifestyle_score',
        'avg_rent_1bhk', 'avg_rent_2bhk', 'avg_rent_3bhk', 'avg_rent_4bhk',
        'price_per_sqft', 'metro_distance_km', 'airport_distance_km', 'cyber_city_distance_km'
    ];

    protected $casts = [
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
        'connectivity_score' => 'decimal:2',
        'safety_score' => 'decimal:2',
        'lifestyle_score' => 'decimal:2',
        'price_per_sqft' => 'decimal:2',
    ];

    public function societies(): HasMany
    {
        return $this->hasMany(Society::class);
    }
}
