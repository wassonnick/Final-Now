<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * A signed-in device.
 *
 * The plain token is returned once, at login, and never stored — only its hash is kept, so
 * a leaked database row cannot be replayed as a session.
 */
class AccountSession extends Model
{
    protected $fillable = [
        'account_id', 'token_hash', 'device_label', 'user_agent',
        'last_used_at', 'expires_at', 'revoked_at',
    ];

    protected $casts = [
        'last_used_at' => 'datetime',
        'expires_at' => 'datetime',
        'revoked_at' => 'datetime',
    ];

    protected $hidden = ['token_hash'];

    public function scopeActive($query)
    {
        return $query->whereNull('revoked_at')->where('expires_at', '>', now());
    }

    public function account(): BelongsTo
    {
        return $this->belongsTo(Account::class);
    }

    /** @return array{0:self,1:string} The session, and the plain token to hand back once. */
    public static function issue(Account $account, ?string $userAgent = null): array
    {
        $plain = Str::random(80);

        $session = self::create([
            'account_id' => $account->id,
            'token_hash' => hash('sha256', $plain),
            'device_label' => self::describe($userAgent),
            'user_agent' => $userAgent ? Str::limit($userAgent, 490, '') : null,
            'last_used_at' => now(),
            'expires_at' => now()->addDays((int) config('services.accounts.session_days', 60)),
        ]);

        return [$session, $plain];
    }

    public static function findUsable(string $plainToken): ?self
    {
        $session = self::query()
            ->where('token_hash', hash('sha256', $plainToken))
            ->whereNull('revoked_at')
            ->where('expires_at', '>', now())
            ->first();

        return $session && ! $session->isIdle() ? $session : null;
    }

    /** Unused for long enough that we should stop honouring it. */
    public function isIdle(): bool
    {
        $idleDays = (int) config('services.accounts.idle_days', 30);

        return $idleDays > 0
            && $this->last_used_at !== null
            && $this->last_used_at->lt(now()->subDays($idleDays));
    }

    /**
     * Records use, but not on every single request.
     *
     * last_used_at only has to be accurate enough to retire abandoned sessions and to show
     * a believable "last active" in the list. Writing a row on every authenticated request
     * would cost far more than that precision is worth.
     */
    public function touchUsage(): void
    {
        if ($this->last_used_at !== null && $this->last_used_at->gt(now()->subMinutes(5))) {
            return;
        }

        $this->forceFill(['last_used_at' => now()])->saveQuietly();
    }

    /** A short human label, since a raw user agent string means nothing in a list. */
    private static function describe(?string $userAgent): string
    {
        $agent = (string) $userAgent;

        $platform = match (true) {
            str_contains($agent, 'iPhone') || str_contains($agent, 'iPad') => 'iOS',
            str_contains($agent, 'Android') => 'Android',
            str_contains($agent, 'Macintosh') => 'Mac',
            str_contains($agent, 'Windows') => 'Windows',
            str_contains($agent, 'Linux') => 'Linux',
            default => null,
        };

        $browser = match (true) {
            str_contains($agent, 'Edg/') => 'Edge',
            str_contains($agent, 'Chrome') => 'Chrome',
            str_contains($agent, 'Firefox') => 'Firefox',
            str_contains($agent, 'Safari') => 'Safari',
            default => null,
        };

        return trim(implode(' · ', array_filter([$platform, $browser]))) ?: 'Unrecognised device';
    }
}
