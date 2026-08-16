<?php

namespace App\Services\Demand;

use App\Models\Lead;
use App\Models\Property;
use App\Models\SavedSearch;
use App\Models\Society;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

/**
 * What people keep asking for that we cannot sell them.
 *
 * Every surface built recently captures intent — a brief carries budget, size, area and
 * commute; a lead carries the requirement in words; a search that ends in "no listed home
 * matches yet" is a request nobody recorded. None of that was ever read back, so the one
 * thing the business most needs to know — which flats to go and sign — was sitting in
 * three tables in three shapes and nobody could see it.
 *
 * The output is deliberately an acquisition list, not an analytics dashboard: a place, a
 * size and a budget, ordered by how many people asked and whether anything we hold could
 * have answered them.
 */
class DemandGapService
{
    /** Buckets thinner than this are noise, not a pattern worth acting on. */
    private const MIN_REQUESTS = 2;

    /**
     * Demand, grouped the way an owner-acquisition call would be made.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function gaps(int $days = 60, int $limit = 25): Collection
    {
        $since = now()->subDays($days)->startOfDay();

        return $this->requests($since)
            ->filter(fn (array $request) => $request['area'] !== '')
            ->groupBy(fn (array $request) => Str::lower($request['area']).'|'.$request['bhk'].'|'.$request['mode'])
            ->map(function (Collection $group) {
                $first = $group->first();
                $budgets = $group->pluck('budget')->filter()->values();

                return [
                    'area' => $first['area'],
                    'bhk' => $first['bhk'],
                    'mode' => $first['mode'],
                    'requests' => $group->count(),
                    'sources' => $group->groupBy('source')->map->count()->all(),
                    // The median is what to quote an owner; an average is dragged around by
                    // one person with an unusual budget.
                    'typical_budget' => $budgets->isNotEmpty() ? $this->median($budgets->all()) : null,
                    'budget_range' => $budgets->isNotEmpty() ? [min($budgets->all()), max($budgets->all())] : null,
                    'notes' => $group->pluck('note')->filter()->take(3)->values()->all(),
                ];
            })
            ->filter(fn (array $row) => $row['requests'] >= self::MIN_REQUESTS)
            ->map(function (array $row) {
                $supply = $this->supplyFor($row);

                return $row + [
                    'listings_available' => $supply['listings'],
                    'societies_known' => $supply['societies'],
                    // Demand nobody can be sent to is the whole point. A bucket with plenty
                    // of listings is already served and does not belong on a call list.
                    'unmet' => $supply['listings'] === 0,
                ];
            })
            ->sortBy([
                fn (array $a, array $b) => ($b['unmet'] <=> $a['unmet']),
                fn (array $a, array $b) => ($b['requests'] <=> $a['requests']),
            ])
            ->take($limit)
            ->values();
    }

    /**
     * Every stated requirement, flattened to one shape.
     *
     * @return Collection<int, array<string, mixed>>
     */
    private function requests(\DateTimeInterface $since): Collection
    {
        return $this->fromBriefs($since)
            ->concat($this->fromLeads($since))
            ->values();
    }

    /** Saved briefs — the richest signal, because every field was answered deliberately. */
    private function fromBriefs(\DateTimeInterface $since): Collection
    {
        return SavedSearch::query()
            ->where('created_at', '>=', $since)
            ->get()
            ->filter(fn (SavedSearch $search) => ($search->filters['kind'] ?? null) === 'brief')
            ->map(function (SavedSearch $search) {
                $filters = $search->filters ?: [];
                $sizes = array_values(array_filter(array_map('intval', explode(',', (string) ($filters['bhk'] ?? '')))));

                return [
                    'area' => trim((string) ($filters['where'] ?? '')) ?: trim((string) ($filters['commute'] ?? '')) ?: trim((string) ($filters['city'] ?? '')),
                    'bhk' => $sizes[0] ?? 0,
                    'mode' => ($filters['mode'] ?? 'rent') === 'buy' ? 'buy' : 'rent',
                    'budget' => (int) ($filters['budget'] ?? 0) ?: null,
                    'source' => 'brief',
                    'note' => trim((string) ($filters['notes'] ?? '')) ?: null,
                ];
            });
    }

    /** Leads — sparser, but they carry the requirements a catalogue cannot filter on. */
    private function fromLeads(\DateTimeInterface $since): Collection
    {
        return Lead::query()
            ->where('created_at', '>=', $since)
            ->get()
            ->map(function (Lead $lead) {
                $text = implode(' ', array_filter([$lead->requirement, $lead->message, $lead->search_query]));

                return [
                    'area' => trim((string) ($lead->target_locality ?: $lead->society_name ?: $lead->target_city ?: '')),
                    'bhk' => $this->bhkFrom($text),
                    'mode' => Str::contains(Str::lower((string) $lead->lead_intent), 'buy') ? 'buy' : 'rent',
                    'budget' => $this->rupeesFrom((string) $lead->budget),
                    'source' => 'lead',
                    'note' => Str::limit(trim($text), 120) ?: null,
                ];
            });
    }

    /**
     * What we could actually offer someone in this bucket today.
     *
     * @return array{listings: int, societies: int}
     */
    private function supplyFor(array $row): array
    {
        $area = $row['area'];

        $listings = Property::query()
            ->publiclyAvailable()
            ->when($row['mode'] === 'rent',
                fn ($query) => $query->where('listing_type', 'Rent'),
                fn ($query) => $query->whereIn('listing_type', ['Sale', 'Buy / Resale', 'Builder Floor']))
            ->when($row['bhk'] > 0, fn ($query) => $query->where('bedrooms', (string) $row['bhk']))
            ->where(fn ($query) => $query->where('locality', 'like', "%{$area}%")
                ->orWhere('society', 'like', "%{$area}%")
                ->orWhere('sector', 'like', "%{$area}%"))
            ->count();

        $societies = Society::query()
            ->where('is_published', true)
            ->where(fn ($query) => $query->where('locality', 'like', "%{$area}%")
                ->orWhere('sector', 'like', "%{$area}%")
                ->orWhere('name', 'like', "%{$area}%"))
            ->count();

        return ['listings' => $listings, 'societies' => $societies];
    }

    /** "3 BHK", "3bhk", "3 bedroom" — 0 when nobody said. */
    private function bhkFrom(string $text): int
    {
        return preg_match('/([0-9])\s*(?:bhk|bed)/i', $text, $match) ? (int) $match[1] : 0;
    }

    /** "₹1.5 Cr", "45000", "50k" — the figures people actually write. */
    private function rupeesFrom(string $value): ?int
    {
        if (! preg_match('/([0-9]+(?:\.[0-9]+)?)\s*(cr|crore|l|lakh|lac|k)?/i', str_replace(',', '', $value), $match)) {
            return null;
        }

        $unit = Str::lower($match[2] ?? '');
        $scale = match (true) {
            str_starts_with($unit, 'c') => 10000000,
            str_starts_with($unit, 'l') => 100000,
            $unit === 'k' => 1000,
            default => 1,
        };

        $amount = (int) round(((float) $match[1]) * $scale);

        return $amount > 0 ? $amount : null;
    }

    private function median(array $values): int
    {
        sort($values);
        $count = count($values);
        $middle = (int) floor($count / 2);

        return $count % 2 === 0
            ? (int) round(($values[$middle - 1] + $values[$middle]) / 2)
            : (int) $values[$middle];
    }
}
