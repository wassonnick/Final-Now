<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SocialAutomationSetting extends Model
{
    protected $fillable = [
        'enabled', 'auto_approve_low_risk', 'auto_publish_low_risk', 'generate_images',
        'posts_per_day', 'platforms', 'publish_hours', 'timezone', 'last_run_at', 'last_run_summary',
    ];

    protected $casts = [
        'enabled' => 'boolean',
        'auto_approve_low_risk' => 'boolean',
        'auto_publish_low_risk' => 'boolean',
        'generate_images' => 'boolean',
        'posts_per_day' => 'integer',
        'platforms' => 'array',
        'publish_hours' => 'array',
        'last_run_at' => 'datetime',
        'last_run_summary' => 'array',
    ];

    public static function current(): self
    {
        return static::firstOrCreate([], [
            'enabled' => true, 'auto_approve_low_risk' => true, 'auto_publish_low_risk' => true,
            'generate_images' => true, 'posts_per_day' => 2,
            'platforms' => ['instagram', 'linkedin'],
            'publish_hours' => [11, 16, 19],
            'timezone' => 'Asia/Kolkata',
        ]);
    }
}
