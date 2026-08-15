<?php

namespace App\Services;

use App\Models\Property;
use App\Models\SavedSearch;
use App\Models\SavedSearchAlert;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SavedSearchMatcher
{
    public function __construct(private readonly MobilePushNotificationService $mobilePush)
    {
    }

    public function run(bool $deliver = true): array
    {
        $summary = ['searches_checked' => 0, 'matches_created' => 0, 'sent' => 0, 'pending' => 0, 'failed' => 0, 'unmatchable' => 0];
        SavedSearch::query()->with('account')->where('alert_enabled', true)->whereHas('account', fn ($q) => $q->where('status', 'active'))->chunkById(100, function ($searches) use (&$summary, $deliver) {
            foreach ($searches as $search) {
                if (! $this->isDue($search)) {
                    continue;
                }
                $summary['searches_checked']++;
                $query = $this->query($search);

                /**
                 * A search we cannot read alerts about nothing.
                 *
                 * Every filter here is opt-in, so an unrecognised filter shape silently
                 * became "no filters" and the query degraded to the entire catalogue —
                 * messaging people about homes in the wrong city at the wrong price. That
                 * is worse than staying quiet, and it is a trap for any future change to
                 * the filter shape, not just the one that caused it.
                 */
                if (! $query) {
                    $summary['unmatchable']++;
                    Log::warning('Saved search has no usable filters; skipped', [
                        'saved_search_id' => $search->id,
                        'filter_keys' => array_keys($search->filters ?: []),
                    ]);
                    $search->update(['last_checked_at' => now()]);

                    continue;
                }

                foreach ($query->limit(50)->get() as $property) {
                    $alert = SavedSearchAlert::firstOrCreate(['saved_search_id' => $search->id, 'property_id' => $property->id], ['account_id' => $search->account_id, 'channel' => $search->alert_channel, 'payload' => $this->payload($search, $property)]);
                    if (! $alert->wasRecentlyCreated) {
                        continue;
                    }
                    $summary['matches_created']++;
                    $result = $deliver ? $this->deliver($alert) : 'pending';
                    $summary[$result]++;
                }
                $search->update(['last_checked_at' => now()]);
            }
        });

        return $summary;
    }

    private function isDue(SavedSearch $search): bool
    {
        if (! $search->last_checked_at) {
            return true;
        }

        return $search->alert_frequency === 'weekly' ? $search->last_checked_at->lte(now()->subWeek()) : $search->last_checked_at->lte(now()->subDay());
    }

    /** Null when nothing in the saved filters could be turned into a constraint. */
    private function query(SavedSearch $search): ?Builder
    {
        $filters = $search->filters ?: [];
        $query = Property::query()->with('society:id,name,slug')->publiclyAvailable();

        $constraints = ($filters['kind'] ?? null) === 'brief'
            ? $this->applyBrief($query, $filters)
            : $this->applySearch($query, $filters);

        if ($constraints === 0) {
            return null;
        }

        return $query->whereDoesntHave('savedSearchAlerts', fn ($q) => $q->where('saved_search_id', $search->id))->latest();
    }

    /** The filters a saved search from the results page writes. */
    private function applySearch(Builder $query, array $filters): int
    {
        $applied = 0;

        $applied += $this->applyListingType($query, (string) ($filters['tab'] ?? ''));
        $applied += $this->applyPlace($query, trim((string) ($filters['q'] ?? $filters['locality'] ?? '')));

        if (! empty($filters['bedrooms']) && is_numeric($filters['bedrooms'])) {
            $query->where('bedrooms', (int) $filters['bedrooms']);
            $applied++;
        }

        return $applied;
    }

    /**
     * The filters a brief writes.
     *
     * A brief knows more than a saved search does — a budget, a set of sizes, a city —
     * and mapping it down to the older shape would have thrown most of that away. It also
     * uses different key names, which is how it came to match everything: none of the
     * keys the older path reads were present, so no constraint was ever applied.
     */
    private function applyBrief(Builder $query, array $filters): int
    {
        $applied = 0;

        $applied += $this->applyListingType($query, (string) ($filters['mode'] ?? ''));
        $applied += $this->applyPlace($query, trim((string) ($filters['where'] ?? '')));

        $city = trim((string) ($filters['city'] ?? ''));
        if ($city !== '') {
            $names = $this->cityNames($city);
            $query->where(fn ($q) => $q->whereIn('city', $names)
                ->orWhereHas('society', fn ($s) => $s->whereIn('city', $names)));
            $applied++;
        }

        $sizes = array_values(array_filter(
            array_map('intval', explode(',', (string) ($filters['bhk'] ?? ''))),
            fn ($size) => $size > 0,
        ));
        if ($sizes !== []) {
            $query->whereIn('bedrooms', array_map('strval', $sizes));
            $applied++;
        }

        $budget = (int) ($filters['budget'] ?? 0);
        if ($budget > 0) {
            // Rent is a monthly figure and a hard ceiling; a buyer will stretch a little.
            // A listing with no numeric price is not excluded — that is missing data, not
            // an expensive home.
            $renting = strtolower((string) ($filters['mode'] ?? '')) === 'rent';
            $column = $renting ? 'rent_amount' : 'sale_price';
            $ceiling = $renting ? $budget : (int) round($budget * 1.1);

            $query->where(fn ($q) => $q->whereNull($column)->orWhere($column, '<=', $ceiling));
            $applied++;
        }

        return $applied;
    }

    private function applyListingType(Builder $query, string $mode): int
    {
        $mode = strtolower(trim($mode));

        if ($mode === 'rent') {
            $query->where('listing_type', 'Rent');

            return 1;
        }

        if (in_array($mode, ['buy', 'sale'], true)) {
            $query->whereIn('listing_type', ['Sale', 'Buy / Resale', 'Builder Floor']);

            return 1;
        }

        return 0;
    }

    private function applyPlace(Builder $query, string $term): int
    {
        if ($term === '') {
            return 0;
        }

        $query->where(fn ($q) => $q->where('title', 'ilike', "%{$term}%")
            ->orWhere('society', 'ilike', "%{$term}%")
            ->orWhere('locality', 'ilike', "%{$term}%")
            ->orWhereHas('society', fn ($s) => $s->where('name', 'ilike', "%{$term}%")));

        return 1;
    }

    /** The catalogue is not consistent about Gurgaon/Gurugram or Delhi/New Delhi. */
    private function cityNames(string $city): array
    {
        return match (mb_strtolower($city)) {
            'gurgaon', 'gurugram' => ['Gurgaon', 'Gurugram'],
            'delhi', 'new delhi' => ['Delhi', 'New Delhi'],
            default => [$city],
        };
    }

    private function payload(SavedSearch $search, Property $property): array
    {
        return ['saved_search' => $search->name, 'property_id' => $property->id, 'title' => $property->title, 'slug' => $property->slug, 'price' => $property->price, 'society' => optional($property->society)->name, 'url' => rtrim((string) config('services.saved_search_alerts.frontend_url'), '/').'/property/'.$property->slug];
    }

    private function deliver(SavedSearchAlert $alert): string
    {
        $webhookConfigured = config('services.saved_search_alerts.enabled') && config('services.saved_search_alerts.webhook_url');
        $webhookSent = false;
        $webhookFailed = false;

        try {
            if ($webhookConfigured) {
                Http::timeout(8)->withToken((string) config('services.saved_search_alerts.webhook_token'))->post((string) config('services.saved_search_alerts.webhook_url'), ['event' => 'saved_search_match', 'channel' => $alert->channel, 'recipient' => $alert->account->phone, 'email' => $alert->account->email, ...$alert->payload])->throw();
                $webhookSent = true;
            }
        } catch (\Throwable $e) {
            $webhookFailed = true;
            $alert->update(['failure_reason' => mb_substr($e->getMessage(), 0, 2000)]);
            Log::warning('Saved search alert failed', ['alert_id' => $alert->id]);
        }

        $push = $this->mobilePush->sendSavedSearchAlert($alert);

        if ($webhookSent || $push['sent'] > 0) {
            $alert->update(['status' => 'sent', 'sent_at' => now()]);
            $alert->savedSearch()->update(['last_alert_sent_at' => now()]);

            return 'sent';
        }

        if ($webhookFailed || $push['failed'] > 0) {
            $alert->update(['status' => 'failed', 'failure_reason' => $alert->failure_reason ?: 'Mobile push delivery failed.']);

            return 'failed';
        }

        return 'pending';
    }
}
