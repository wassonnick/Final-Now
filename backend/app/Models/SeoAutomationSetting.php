<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SeoAutomationSetting extends Model
{
    protected $fillable = [
        'enabled', 'audit_enabled', 'technical_checks_enabled', 'search_console_enabled',
        'keyword_refresh_enabled', 'draft_generation_enabled', 'reports_enabled',
        'drafts_per_run', 'timezone',
    ];

    protected $casts = [
        'enabled'=>'boolean', 'audit_enabled'=>'boolean', 'technical_checks_enabled'=>'boolean',
        'search_console_enabled'=>'boolean', 'keyword_refresh_enabled'=>'boolean',
        'draft_generation_enabled'=>'boolean', 'reports_enabled'=>'boolean',
        'drafts_per_run'=>'integer',
    ];
}
