<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class SocietyImageContribution extends Model
{
    protected $fillable = [
        'society_id', 'account_id', 'contributor_role', 'contributor_name', 'contributor_email',
        'contributor_phone', 'image_path', 'caption', 'width', 'height', 'rights_granted',
        'rights_statement', 'rights_granted_at', 'status', 'screen', 'review_notes',
        'reviewed_by', 'reviewed_at', 'used_as_cover',
    ];

    protected $casts = [
        'rights_granted' => 'boolean',
        'used_as_cover' => 'boolean',
        'rights_granted_at' => 'datetime',
        'reviewed_at' => 'datetime',
        'screen' => 'array',
    ];

    protected $appends = ['image_url'];

    /**
     * Who may speak for a society, and the wording each is asked to attest to.
     *
     * The statement is stored verbatim on the contribution, so it lives here rather than
     * in the form: changing the copy later must not silently rewrite what past
     * contributors agreed to.
     */
    public const ROLES = [
        'resident' => 'I live in this society and I took this photograph, and I grant SocietyFlats permission to publish it.',
        'owner' => 'I own a home in this society and I took this photograph, and I grant SocietyFlats permission to publish it.',
        'rwa' => 'I represent the resident welfare association of this society and I am authorised to grant SocietyFlats permission to publish this image.',
        'builder' => 'I represent the developer of this project and I am authorised to grant SocietyFlats permission to publish this image.',
        'staff' => 'This image was shot or licensed by SocietyFlats and may be published.',
    ];

    /**
     * How an approval maps onto the image statuses the public site will render.
     *
     * A resident's own photograph and a developer's marketing image are both publishable
     * but on different grounds, and the society row should say which — the provenance is
     * what makes the claim checkable a year from now.
     */
    public const STATUS_FOR_ROLE = [
        'resident' => 'self_shot_uploaded',
        'owner' => 'self_shot_uploaded',
        'rwa' => 'self_shot_uploaded',
        'builder' => 'developer_permission_received',
        'staff' => 'licensed_uploaded',
    ];

    public function society(): BelongsTo
    {
        return $this->belongsTo(Society::class);
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    public function getImageUrlAttribute(): ?string
    {
        $path = (string) ($this->image_path ?? '');

        return $path === '' ? null : Storage::disk(config('filesystems.uploads_disk', 'public'))->url($path);
    }

    public function publishableStatus(): string
    {
        return self::STATUS_FOR_ROLE[$this->contributor_role] ?? 'self_shot_uploaded';
    }

    public function creditLine(): string
    {
        return match ($this->contributor_role) {
            'builder' => 'Provided by the developer',
            'rwa' => 'Provided by the RWA',
            'staff' => 'SocietyFlats',
            default => 'Provided by a resident',
        };
    }
}
