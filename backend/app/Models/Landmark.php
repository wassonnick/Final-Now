<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class Landmark extends Model
{
    protected $fillable = [
        'name', 'slug', 'aliases', 'category', 'city',
        'latitude', 'longitude', 'source', 'place_id', 'searches',
    ];

    protected $casts = [
        'aliases' => 'array',
        'latitude' => 'float',
        'longitude' => 'float',
    ];

    /**
     * The comparable form of a landmark name.
     *
     * People type "cyberhub", "cyber hub" and "DLF Cyber Hub" for one place, so spaces and
     * punctuation cannot be part of the identity. Kept separate from the slug, which is a
     * URL and has to stay readable.
     */
    public static function matchKey(string $value): string
    {
        return preg_replace('/[^a-z0-9]/', '', Str::lower($value)) ?? '';
    }

    /** @return array<int,string> */
    public function matchKeys(): array
    {
        return array_values(array_unique(array_filter(array_map(
            fn ($value) => self::matchKey((string) $value),
            [$this->name, ...((array) ($this->aliases ?? []))],
        ))));
    }

    /**
     * Kilometres from here to a point, on the great circle.
     *
     * Computed in PHP rather than SQL on purpose. The published catalogue is a few hundred
     * rows, so the saving from a database function is imperceptible, and every SQL-side
     * distance formula I could write would be another Postgres-only expression that cannot
     * be covered by a test — which is exactly how the admin account controller ended up
     * with no tests at all.
     */
    public function distanceTo(?float $latitude, ?float $longitude): ?float
    {
        if ($latitude === null || $longitude === null) {
            return null;
        }

        $earthRadius = 6371;
        $dLat = deg2rad($latitude - $this->latitude);
        $dLon = deg2rad($longitude - $this->longitude);

        $a = sin($dLat / 2) ** 2
            + cos(deg2rad($this->latitude)) * cos(deg2rad($latitude)) * sin($dLon / 2) ** 2;

        return round($earthRadius * 2 * atan2(sqrt($a), sqrt(1 - $a)), 2);
    }
}
