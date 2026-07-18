<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Admin-authored campaign landing pages, rendered by the frontend's generic
 * CampaignLandingPage at /go/<slug>. The payload mirrors the shape of the
 * config-defined campaigns in frontend/src/config/campaigns.ts.
 */
class CampaignPage extends Model
{
    public const STATUS_DRAFT = 'draft';
    public const STATUS_PUBLISHED = 'published';

    protected $fillable = ['slug', 'status', 'payload'];

    protected $casts = ['payload' => 'array'];
}
