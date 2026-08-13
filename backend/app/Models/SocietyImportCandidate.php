<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class SocietyImportCandidate extends Model
{
    public const STATUS_NEW = 'new';

    public const STATUS_LIKELY_DUPLICATE = 'likely_duplicate';

    public const STATUS_DISMISSED = 'dismissed';

    public const STATUS_IMPORTED = 'imported';

    protected $fillable = [
        'place_id', 'name', 'normalised_name', 'address', 'area', 'locality', 'city', 'city_id',
        'latitude', 'longitude', 'types', 'rating_count', 'status', 'status_reason',
        'society_id', 'import_job_id', 'first_seen_at', 'last_seen_at',
    ];

    protected $casts = [
        'types' => 'array',
        'first_seen_at' => 'datetime',
        'last_seen_at' => 'datetime',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    /**
     * The comparable form of a society name.
     *
     * Sources spell the same place a dozen ways — "DLF Belvedere Park", "Belvedere Park
     * Apartments", "belvedere park chs". Matching on the raw string would report a society
     * we already hold as a gap, which is the failure that makes a discovery queue useless:
     * an operator who finds three duplicates in a row stops reading it.
     *
     * Deliberately conservative. It removes wrappers that carry no identity, not words that
     * distinguish one project from another.
     */
    public static function normalise(string $name): string
    {
        $value = Str::lower(trim($name));
        $value = preg_replace('/[^a-z0-9\s]/', ' ', $value) ?? $value;

        // Trailing noise only — "Apartments" at the end is a wrapper, but "Apartment Heights"
        // would be a name, so anchor these to the end of the string.
        $wrappers = ['apartments', 'apartment', 'flats', 'society', 'societies', 'chs',
            'co operative housing society', 'cooperative housing society', 'housing society',
            'complex', 'residential complex', 'condominium', 'condominiums'];

        // Longest first, or "society" is stripped out of "housing society" and leaves
        // "housing" stranded on the end of the name.
        usort($wrappers, fn ($a, $b) => strlen($b) <=> strlen($a));

        $changed = true;
        while ($changed) {
            $changed = false;
            foreach ($wrappers as $wrapper) {
                $pattern = '/\s+'.preg_quote($wrapper, '/').'\s*$/';
                $next = preg_replace($pattern, '', $value) ?? $value;
                if ($next !== $value) {
                    $value = $next;
                    $changed = true;
                }
            }
        }

        return trim(preg_replace('/\s+/', ' ', $value) ?? $value);
    }

    public function society(): BelongsTo
    {
        return $this->belongsTo(Society::class);
    }

    public function importJob(): BelongsTo
    {
        return $this->belongsTo(SocietyImportJob::class, 'import_job_id');
    }

    public function isActionable(): bool
    {
        return in_array($this->status, [self::STATUS_NEW, self::STATUS_LIKELY_DUPLICATE], true);
    }
}
