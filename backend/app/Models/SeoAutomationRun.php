<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SeoAutomationRun extends Model
{
    /** A run killed mid-cycle is "interrupted", which is not the same as a run that failed. */
    public const STATUS_INTERRUPTED = 'interrupted';

    protected $fillable = ['trigger', 'status', 'started_at', 'heartbeat_at', 'current_phase', 'finished_at', 'summary', 'error'];
    protected $casts = ['started_at'=>'datetime', 'heartbeat_at'=>'datetime', 'finished_at'=>'datetime', 'summary'=>'array'];
}
