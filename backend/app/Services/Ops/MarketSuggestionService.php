<?php

namespace App\Services\Ops;

use App\Models\OpsSuggestion;
use App\Models\Society;
use App\Services\SocietyAiEnrichmentService;

/**
 * Scheduled market-data refresh, suggestion-first: the AI result is stored as
 * a pending OpsSuggestion and nothing touches the society until an admin
 * applies it. Applying reuses the same review-flagged semantics as the manual
 * market-refresh action (data lands + verification_status returns to review).
 */
class MarketSuggestionService
{
    public const MARKET_FIELDS = ['rent_range', 'buy_range', 'price_per_sqft', 'rental_yield', 'average_rent', 'average_sale_price'];

    public function __construct(private readonly SocietyAiEnrichmentService $ai)
    {
    }

    /**
     * Market fields an admin has manually set and locked. Automated refreshes (scheduler,
     * manual "refresh", suggestion apply) must never overwrite these — they hold the exact
     * portal figure the admin curated, which web search cannot reliably reproduce.
     *
     * @return array<int,string>
     */
    public static function lockedFields(Society $society): array
    {
        return array_values(array_intersect(
            self::MARKET_FIELDS,
            (array) data_get($society->field_sources, 'market.locked', []),
        ));
    }

    /**
     * Manually set one or more market fields and lock them from automated refresh. Blank
     * values are ignored (never used to clear a field). Returns the applied updates (empty
     * array when nothing usable was supplied). `$unlock` releases fields back to automation.
     *
     * @param  array<string,mixed>  $values
     * @param  array<int,string>  $unlock
     * @return array<string,mixed>
     */
    public function applyOverride(Society $society, array $values, array $unlock = []): array
    {
        $updates = [];
        foreach (self::MARKET_FIELDS as $field) {
            if (! array_key_exists($field, $values)) {
                continue;
            }
            if ($values[$field] === null || trim((string) $values[$field]) === '') {
                continue; // blank means "leave as-is", never wipe a real value
            }
            $clean = self::sanitizeMarketValue($field, $values[$field]);
            if ($clean !== null) {
                $updates[$field] = $clean;
            }
        }

        $locked = self::lockedFields($society);
        $locked = array_values(array_diff($locked, $unlock)); // release requested fields
        $locked = array_values(array_unique(array_merge($locked, array_keys($updates))));

        if ($updates === [] && $unlock === []) {
            return [];
        }

        $fieldSources = (array) ($society->field_sources ?? []);
        $market = (array) ($fieldSources['market'] ?? []);
        $fieldSources['market'] = array_merge($market, [
            'source' => 'admin_override',
            'confidence' => 'high',
            'notes' => 'Buy/rent set manually by admin to match the portal price range.',
            'refreshed_at' => now()->toIso8601String(),
            'locked' => $locked,
        ]);
        $updates['field_sources'] = $fieldSources;

        $this->logRefresh($society, $updates, 'auto', $result['market_sources'] ?? [], $result['confidence'] ?? null, $result['notes'] ?? null);
        $society->update($updates);

        return $updates;
    }

    /**
     * Clean a single AI market value: strip any parenthetical/aside so ranges stay short,
     * and drop values that fail a plausibility check for their field. Returns null when the
     * value is unusable (caller should then skip the field).
     */
    public static function sanitizeMarketValue(string $field, mixed $value): ?string
    {
        $clean = trim(preg_replace('/\s*[(;].*$/u', '', trim((string) $value)) ?? (string) $value);
        if ($clean === '' || strtolower($clean) === 'null' || mb_strlen($clean) > 60) {
            return null;
        }

        // A monthly rent expressed in crores is always a lakh/crore units error — reject it
        // rather than publish an impossible figure (e.g. "₹2.5 - ₹3.5 Cr per month").
        if (in_array($field, ['rent_range', 'average_rent'], true) && preg_match('/\b(cr|crore|crores)\b/i', $clean)) {
            return null;
        }

        return $clean;
    }

    /** Fetch grounded market data and store it as a pending suggestion. */
    public function fetchForSociety(Society $society): ?OpsSuggestion
    {
        $result = $this->ai->enrichMarketDataOnly($society->name, (string) $society->sector, (string) ($society->city ?: 'Gurugram'));

        if (isset($result['_ai_error'])) {
            if (AiBudgetGuard::isProviderLimit($result)) {
                throw new \App\Exceptions\AiProviderLimitException('Market fetch hit provider limit: '.$result['_ai_error']);
            }
            throw new \RuntimeException('Market fetch failed: '.$result['_ai_error']);
        }

        $locked = self::lockedFields($society);

        $updates = [];
        foreach (self::MARKET_FIELDS as $field) {
            if (in_array($field, $locked, true)) {
                continue; // don't suggest changes to admin-locked fields
            }
            if (array_key_exists($field, $result) && $result[$field] !== null && trim((string) $result[$field]) !== '') {
                $clean = self::sanitizeMarketValue($field, $result[$field]);
                if ($clean !== null) {
                    $updates[$field] = $clean;
                }
            }
        }

        if ($updates === []) {
            return null;
        }

        $current = collect(self::MARKET_FIELDS)
            ->mapWithKeys(fn ($field) => [$field => $society->{$field}])
            ->all();

        // The grounded search has already been paid for at this point, whether or not
        // anyone ever approves the suggestion. Record it now so spend and outcome can be
        // compared; applying it later logs the application separately.
        $this->logRefresh(
            $society,
            $updates,
            'auto_fetch',
            $result['market_sources'] ?? [],
            $result['confidence'] ?? null,
            $result['notes'] ?? null,
            applied: false,
        );

        return OpsSuggestion::updateOrCreate(
            ['society_id' => $society->id, 'kind' => 'market_refresh', 'status' => 'pending'],
            [
                'payload' => [
                    'updates' => $updates,
                    'current' => $current,
                    'confidence' => $result['confidence'] ?? null,
                    'notes' => $result['notes'] ?? null,
                    'sources' => $result['market_sources'] ?? [],
                    'fetched_at' => now()->toIso8601String(),
                ],
                'created_by' => 'system',
            ],
        );
    }

    /** Apply a pending market suggestion — same semantics as the manual market-refresh action. */

    /**
     * Record both sides of a refresh. Only the fields that actually moved are listed as
     * changed, so a run that cost real money and altered nothing is visible as exactly
     * that rather than looking like a success.
     *
     * @param  array<string,mixed>  $updates  the values being written
     */
    private function logRefresh(Society $society, array $updates, string $trigger, ?array $sources, $confidence, ?string $notes, bool $applied = true): void
    {
        try {
            $before = [];
            $after = [];
            $changed = [];

            foreach (self::MARKET_FIELDS as $field) {
                if (! array_key_exists($field, $updates)) {
                    continue;
                }
                $old = (string) ($society->getOriginal($field) ?? '');
                $new = (string) ($updates[$field] ?? '');
                $before[$field] = $old;
                $after[$field] = $new;
                if (trim($old) !== trim($new)) {
                    $changed[] = $field;
                }
            }

            // A search that proposed no changes still cost a grounded web call. Recording
            // the current values on both sides makes that visible as "changed nothing"
            // rather than as no run at all — which is precisely the case worth reviewing.
            if ($before === []) {
                foreach (self::MARKET_FIELDS as $field) {
                    $value = (string) ($society->getOriginal($field) ?? '');
                    $before[$field] = $value;
                    $after[$field] = $value;
                }
            }

            \App\Models\MarketRefreshLog::create([
                'applied' => $applied,
                'society_id' => $society->id,
                'trigger' => $trigger,
                'before' => $before,
                'after' => $after,
                'changed_fields' => $changed,
                'sources' => $sources ?: [],
                'confidence' => is_numeric($confidence) ? (int) $confidence : null,
                'notes' => $notes,
            ]);
        } catch (\Throwable $e) {
            // Never let an audit write break the refresh it is describing.
            report($e);
        }
    }

    public function apply(OpsSuggestion $suggestion): Society
    {
        if ($suggestion->kind !== 'market_refresh' || $suggestion->status !== 'pending') {
            throw new \InvalidArgumentException('Only pending market suggestions can be applied.');
        }

        $society = $suggestion->society;
        $payload = $suggestion->payload;
        $locked = self::lockedFields($society);
        // Never let a stored suggestion overwrite a field the admin has since locked.
        $updates = collect((array) ($payload['updates'] ?? []))
            ->reject(fn ($v, $k) => in_array($k, $locked, true))
            ->all();

        $fieldSources = (array) ($society->field_sources ?? []);
        $fieldSources['market'] = [
            'confidence' => $payload['confidence'] ?? null,
            'notes' => $payload['notes'] ?? null,
            'sources' => $payload['sources'] ?? [],
            'refreshed_at' => now()->toIso8601String(),
            'locked' => $locked,
        ];
        $updates['field_sources'] = $fieldSources;
        $updates['verification_status'] = 'Needs Review';

        $fieldsToVerify = collect((array) ($society->fields_to_verify ?? []))
            ->reject(fn ($f) => in_array($f, self::MARKET_FIELDS, true))
            ->values()
            ->all();
        $updates['fields_to_verify'] = array_merge($fieldsToVerify, ['rent_range', 'buy_range', 'price_per_sqft', 'rental_yield']);

        $this->logRefresh($society, $updates, 'suggestion', $payload['sources'] ?? [], $payload['confidence'] ?? null, $payload['notes'] ?? null);
        $society->update($updates);
        $suggestion->update(['status' => 'applied', 'resolved_at' => now()]);

        return $society->fresh();
    }

    /**
     * Fully automatic refresh: fetch grounded market data and apply it directly to the
     * society, keeping a published society published (no review gate). Only the market
     * fields and field_sources.market provenance are touched — scores, description,
     * amenities and everything else are left exactly as-is. Returns the applied updates,
     * or null when the AI returned no usable market figure (society untouched).
     */
    public function refreshAndApply(Society $society): ?array
    {
        $result = $this->ai->enrichMarketDataOnly($society->name, (string) $society->sector, (string) ($society->city ?: 'Gurugram'));

        if (isset($result['_ai_error'])) {
            if (AiBudgetGuard::isProviderLimit($result)) {
                throw new \App\Exceptions\AiProviderLimitException('Market fetch hit provider limit: '.$result['_ai_error']);
            }
            throw new \RuntimeException('Market fetch failed: '.$result['_ai_error']);
        }

        $locked = self::lockedFields($society);

        $updates = [];
        foreach (self::MARKET_FIELDS as $field) {
            if (in_array($field, $locked, true)) {
                continue; // admin-locked: never auto-overwrite the curated portal figure
            }
            $value = $result[$field] ?? null;
            if ($value !== null && trim((string) $value) !== '') {
                $clean = self::sanitizeMarketValue($field, $value);
                if ($clean !== null) {
                    $updates[$field] = $clean;
                }
            }
        }

        if ($updates === []) {
            // The search was paid for and produced nothing usable. Previously this
            // returned silently, so the runs least worth repeating were the ones the log
            // could never show.
            $this->logRefresh($society, [], 'auto_nightly', $result['market_sources'] ?? [], $result['confidence'] ?? null, 'Search returned no usable market figure.');

            return null;
        }

        $fieldSources = (array) ($society->field_sources ?? []);
        $fieldSources['market'] = [
            'confidence' => $result['confidence'] ?? null,
            'notes' => $result['notes'] ?? null,
            'sources' => $result['market_sources'] ?? [],
            'refreshed_at' => now()->toIso8601String(),
            'auto_applied' => true,
            'locked' => $locked, // preserve any admin locks across the refresh
        ];
        $updates['field_sources'] = $fieldSources;

        // Log before the write, so `before` is genuinely the previous value.
        $this->logRefresh($society, $updates, 'auto_nightly', $result['market_sources'] ?? [], $result['confidence'] ?? null, $result['notes'] ?? null);

        $society->update($updates);

        return $updates;
    }
}
