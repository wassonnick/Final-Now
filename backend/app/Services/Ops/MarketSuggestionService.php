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

    /** Fetch grounded market data and store it as a pending suggestion. */
    public function fetchForSociety(Society $society): ?OpsSuggestion
    {
        $result = $this->ai->enrichMarketDataOnly($society->name, (string) $society->sector, (string) ($society->city ?: 'Gurugram'));

        if (isset($result['_ai_error'])) {
            throw new \RuntimeException('Market fetch failed: '.$result['_ai_error']);
        }

        $updates = [];
        foreach (self::MARKET_FIELDS as $field) {
            if (array_key_exists($field, $result) && $result[$field] !== null && trim((string) $result[$field]) !== '') {
                $updates[$field] = trim((string) $result[$field]);
            }
        }

        if ($updates === []) {
            return null;
        }

        $current = collect(self::MARKET_FIELDS)
            ->mapWithKeys(fn ($field) => [$field => $society->{$field}])
            ->all();

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
    public function apply(OpsSuggestion $suggestion): Society
    {
        if ($suggestion->kind !== 'market_refresh' || $suggestion->status !== 'pending') {
            throw new \InvalidArgumentException('Only pending market suggestions can be applied.');
        }

        $society = $suggestion->society;
        $payload = $suggestion->payload;
        $updates = (array) ($payload['updates'] ?? []);

        $fieldSources = (array) ($society->field_sources ?? []);
        $fieldSources['market'] = [
            'confidence' => $payload['confidence'] ?? null,
            'notes' => $payload['notes'] ?? null,
            'sources' => $payload['sources'] ?? [],
            'refreshed_at' => now()->toIso8601String(),
        ];
        $updates['field_sources'] = $fieldSources;
        $updates['verification_status'] = 'Needs Review';

        $fieldsToVerify = collect((array) ($society->fields_to_verify ?? []))
            ->reject(fn ($f) => in_array($f, self::MARKET_FIELDS, true))
            ->values()
            ->all();
        $updates['fields_to_verify'] = array_merge($fieldsToVerify, ['rent_range', 'buy_range', 'price_per_sqft', 'rental_yield']);

        $society->update($updates);
        $suggestion->update(['status' => 'applied', 'resolved_at' => now()]);

        return $society->fresh();
    }
}
