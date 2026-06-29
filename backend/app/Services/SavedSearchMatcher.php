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
    public function run(bool $deliver = true): array
    {
        $summary = ['searches_checked' => 0, 'matches_created' => 0, 'sent' => 0, 'pending' => 0, 'failed' => 0];
        SavedSearch::query()->with('account')->where('alert_enabled', true)->whereHas('account', fn ($q) => $q->where('status', 'active'))->chunkById(100, function ($searches) use (&$summary, $deliver) {
            foreach ($searches as $search) {
                if (! $this->isDue($search)) {
                    continue;
                }
                $summary['searches_checked']++;
                foreach ($this->query($search)->limit(50)->get() as $property) {
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

    private function query(SavedSearch $search): Builder
    {
        $filters = $search->filters ?: [];
        $query = Property::query()->with('society:id,name,slug')->publiclyAvailable();
        $tab = strtolower((string) ($filters['tab'] ?? ''));
        if ($tab === 'rent') {
            $query->where('listing_type', 'Rent');
        }
        if ($tab === 'buy') {
            $query->whereIn('listing_type', ['Sale', 'Buy / Resale', 'Builder Floor']);
        }
        $term = trim((string) ($filters['q'] ?? $filters['locality'] ?? ''));
        if ($term !== '') {
            $query->where(fn ($q) => $q->where('title', 'ilike', "%{$term}%")->orWhere('society', 'ilike', "%{$term}%")->orWhere('locality', 'ilike', "%{$term}%")->orWhereHas('society', fn ($s) => $s->where('name', 'ilike', "%{$term}%")));
        }
        if (! empty($filters['bedrooms']) && is_numeric($filters['bedrooms'])) {
            $query->where('bedrooms', (int) $filters['bedrooms']);
        }

        return $query->whereDoesntHave('savedSearchAlerts', fn ($q) => $q->where('saved_search_id', $search->id))->latest();
    }

    private function payload(SavedSearch $search, Property $property): array
    {
        return ['saved_search' => $search->name, 'property_id' => $property->id, 'title' => $property->title, 'slug' => $property->slug, 'price' => $property->price, 'society' => optional($property->society)->name, 'url' => rtrim((string) config('services.saved_search_alerts.frontend_url'), '/').'/property/'.$property->slug];
    }

    private function deliver(SavedSearchAlert $alert): string
    {
        if (! config('services.saved_search_alerts.enabled') || ! config('services.saved_search_alerts.webhook_url')) {
            return 'pending';
        }
        try {
            Http::timeout(8)->withToken((string) config('services.saved_search_alerts.webhook_token'))->post((string) config('services.saved_search_alerts.webhook_url'), ['event' => 'saved_search_match', 'channel' => $alert->channel, 'recipient' => $alert->account->phone, 'email' => $alert->account->email, ...$alert->payload])->throw();
            $alert->update(['status' => 'sent', 'sent_at' => now()]);
            $alert->savedSearch()->update(['last_alert_sent_at' => now()]);

            return 'sent';
        } catch (\Throwable $e) {
            $alert->update(['status' => 'failed', 'failure_reason' => mb_substr($e->getMessage(), 0, 2000)]);
            Log::warning('Saved search alert failed', ['alert_id' => $alert->id]);

            return 'failed';
        }
    }
}
