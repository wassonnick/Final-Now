<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AiConversation extends Model
{
    /**
     * How a conversation ended, ordered weakest → strongest. The exit beacon fires on
     * every page-hide, so a later "abandoned" must never overwrite a real outcome that
     * already happened — ranking is what stops that.
     */
    public const OUTCOMES = ['abandoned', 'reset', 'errored', 'refined', 'society_opened', 'lead_started'];

    protected $fillable = [
        'access_token_hash', 'status', 'model', 'last_message_at', 'expires_at',
        'entry_source', 'entry_label', 'entry_path',
        'outcome', 'outcome_detail', 'ended_at',
    ];

    protected $hidden = ['access_token_hash'];

    protected $casts = ['last_message_at' => 'datetime', 'expires_at' => 'datetime', 'ended_at' => 'datetime'];

    public function messages(): HasMany
    {
        return $this->hasMany(AiMessage::class);
    }

    public static function outcomeRank(?string $outcome): int
    {
        $index = array_search($outcome, self::OUTCOMES, true);

        return $index === false ? -1 : (int) $index;
    }

    /** Record an outcome unless a stronger one is already on record. */
    public function recordOutcome(string $outcome, ?string $detail = null): bool
    {
        if (self::outcomeRank($outcome) < self::outcomeRank($this->outcome)) {
            return false;
        }

        $this->update([
            'outcome' => $outcome,
            'outcome_detail' => $detail !== null ? mb_substr($detail, 0, 160) : $this->outcome_detail,
            'ended_at' => now(),
        ]);

        return true;
    }
}
