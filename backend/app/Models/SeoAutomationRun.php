<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SeoAutomationRun extends Model
{
    protected $fillable = ['trigger', 'status', 'started_at', 'finished_at', 'summary', 'error'];
    protected $casts = ['started_at'=>'datetime', 'finished_at'=>'datetime', 'summary'=>'array'];
}
