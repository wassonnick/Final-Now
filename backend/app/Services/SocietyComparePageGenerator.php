<?php

namespace App\Services;

use App\Models\Society;
use App\Models\SocietyComparePage;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;

class SocietyComparePageGenerator
{
    public const QUALITY_THRESHOLD = 45;

    /**
     * Content is deterministic (derived from admin-reviewed published data, no AI), so pages
     * clearing this higher bar publish without a human in the loop; 45–59 stays in review.
     */
    public const AUTO_PUBLISH_THRESHOLD = 60;

    public function generateForAll(int $limit = 100): array
    {
        $summary = [
            'checked' => 0,
            'created' => 0,
            'updated' => 0,
            'skipped_duplicates' => 0,
            'missing_data' => 0,
            'low_quality' => 0,
            'items' => [],
        ];

        $societies = $this->publishedSocieties()->limit($limit)->get();

        foreach ($societies as $society) {
            $summary['checked']++;
            $result = $this->generateForSociety($society);
            $summary[$result['status']] = ($summary[$result['status']] ?? 0) + 1;
            $summary['items'][] = $result;
        }

        return $summary;
    }

    public function generateForSociety(Society $society, bool $force = false): array
    {
        if (! $this->isUsableSociety($society)) {
            return ['status' => 'missing_data', 'society' => $society->name, 'reason' => 'Society is not public or has too little approved data.'];
        }

        $candidates = $this->rankCandidates($society)->take(2)->values();

        if ($candidates->count() < 2) {
            return ['status' => 'missing_data', 'society' => $society->name, 'reason' => 'Fewer than two comparable published societies.'];
        }

        $triplet = collect([$society, ...$candidates])->values();
        $quality = $this->qualityScore($triplet);

        if ($quality < self::QUALITY_THRESHOLD) {
            return ['status' => 'low_quality', 'society' => $society->name, 'quality' => $quality];
        }

        $signature = $this->tripletSignature($triplet);
        $existing = SocietyComparePage::query()->get()->first(function (SocietyComparePage $page) use ($signature) {
            return $this->tripletSignature(collect([$page->society_a_id, $page->society_b_id, $page->society_c_id])) === $signature;
        });

        $payload = $this->buildPayload($triplet, $quality);

        if ($existing) {
            if (! $force) {
                return ['status' => 'skipped_duplicates', 'id' => $existing->id, 'slug' => $existing->slug, 'quality' => $quality];
            }

            if ($existing->status === SocietyComparePage::STATUS_PUBLISHED) {
                $existing->update([
                    'status' => SocietyComparePage::STATUS_STALE,
                    'published_at' => null,
                    'stale_reason' => 'Comparison regenerated after society data changed.',
                ]);
            }

            $existing->update(array_merge($payload, [
                'status' => SocietyComparePage::STATUS_NEEDS_REVIEW,
                'published_at' => null,
                'stale_reason' => null,
            ]));

            return ['status' => 'updated', 'id' => $existing->id, 'slug' => $existing->slug, 'quality' => $quality];
        }

        $page = SocietyComparePage::create($payload);

        return ['status' => 'created', 'id' => $page->id, 'slug' => $page->slug, 'quality' => $quality];
    }

    /**
     * Repair a stale page in place, keeping its slug (URL equity) and its exact triplet.
     * Society updates — including the automatic 14-day market refresh — mark pages stale
     * and unpublish them; without this, published compare pages die and never come back.
     * Returns the new status, or null when the triplet no longer qualifies (page stays stale).
     */
    public function rebuildPage(SocietyComparePage $page, bool $autoPublish = false): ?string
    {
        $societies = collect([$page->societyA, $page->societyB, $page->societyC])->filter()->values();

        if ($societies->count() < 3 || $societies->contains(fn (Society $society) => ! $this->isUsableSociety($society))) {
            return null;
        }

        $quality = $this->qualityScore($societies);
        if ($quality < self::QUALITY_THRESHOLD) {
            return null;
        }

        $payload = $this->buildPayload($societies, $quality);
        unset($payload['slug']);

        $publish = $autoPublish && $quality >= self::AUTO_PUBLISH_THRESHOLD;
        $page->update(array_merge($payload, [
            'status' => $publish ? SocietyComparePage::STATUS_PUBLISHED : SocietyComparePage::STATUS_NEEDS_REVIEW,
            'published_at' => $publish ? now() : null,
            'stale_reason' => null,
        ]));

        return $page->status;
    }

    public function markStaleForSociety(Society $society, string $reason): int
    {
        return SocietyComparePage::query()
            ->where(function ($query) use ($society) {
                $query->where('society_a_id', $society->id)
                    ->orWhere('society_b_id', $society->id)
                    ->orWhere('society_c_id', $society->id);
            })
            ->whereIn('status', [SocietyComparePage::STATUS_APPROVED, SocietyComparePage::STATUS_PUBLISHED, SocietyComparePage::STATUS_NEEDS_REVIEW])
            ->update([
                'status' => SocietyComparePage::STATUS_STALE,
                'published_at' => null,
                'stale_reason' => $reason,
            ]);
    }

    private function publishedSocieties()
    {
        return Society::query()
            ->where('is_published', true)
            ->whereIn('status', ['Verified', 'Premium'])
            ->orderByDesc('score')
            ->orderBy('name');
    }

    private function isUsableSociety(Society $society): bool
    {
        if (! $society->is_published || ! in_array($society->status, ['Verified', 'Premium'], true)) {
            return false;
        }

        $signals = array_filter([
            $society->sector,
            $society->locality,
            $society->builder,
            $society->score,
            $society->amenities ? 'amenities' : null,
            $society->description,
        ]);

        return count($signals) >= 3;
    }

    private function rankCandidates(Society $anchor): Collection
    {
        return $this->publishedSocieties()
            ->where('id', '!=', $anchor->id)
            ->get()
            ->filter(fn (Society $candidate) => $this->isUsableSociety($candidate) && $this->sameCity($anchor, $candidate))
            ->map(fn (Society $candidate) => ['society' => $candidate, 'score' => $this->matchScore($anchor, $candidate)])
            ->sortByDesc('score')
            ->values()
            ->pluck('society');
    }

    private function matchScore(Society $anchor, Society $candidate): int
    {
        $score = 0;

        if ($this->sameText($anchor->sector, $candidate->sector)) {
            $score += 30;
        } elseif ($this->nearbySector($anchor->sector, $candidate->sector)) {
            $score += 20;
        }

        if ($this->sameText($anchor->locality, $candidate->locality)) {
            $score += 20;
        }

        if ($this->sameText($anchor->builder, $candidate->builder)) {
            $score += 10;
        }

        $score += min(10, count(array_intersect($this->amenities($anchor), $this->amenities($candidate))) * 2);

        if (abs(((float) $anchor->score) - ((float) $candidate->score)) <= 1.0) {
            $score += 10;
        }

        if ($anchor->rent_range && $candidate->rent_range) {
            $score += 5;
        }

        if ($anchor->buy_range && $candidate->buy_range) {
            $score += 5;
        }

        return $score;
    }

    private function buildPayload(Collection $societies, float $quality): array
    {
        $ordered = $societies->values();
        $a = $ordered[0];
        $b = $ordered[1];
        $c = $ordered[2];
        $slug = Str::slug($a->slug . '-vs-' . $b->slug . '-vs-' . $c->slug);
        $title = "{$a->name} vs {$b->name} vs {$c->name}";
        $city = $a->city ?: 'Gurgaon';
        $sectorCluster = collect([$a->sector, $b->sector, $c->sector])->filter()->unique()->join(' / ');
        $facts = $this->facts($ordered);

        return [
            'slug' => $slug,
            'title' => $title,
            // Three society names already push the title long; only append the brand
            // suffix when it still fits a sane SERP width.
            'meta_title' => mb_strlen($title) <= 48 ? "{$title} | SocietyFlats" : $title,
            'meta_description' => $this->metaDescription($ordered, $facts),
            'h1' => $title,
            'society_a_id' => $a->id,
            'society_b_id' => $b->id,
            'society_c_id' => $c->id,
            'comparison_type' => 'nearby_societies',
            'city' => $city,
            'sector_cluster' => $sectorCluster,
            'intro' => $this->introCopy($ordered, $facts, $sectorCluster, $city),
            'comparison_summary' => $this->summaryCopy($ordered, $facts),
            'best_for_json' => $this->bestFor($ordered, $facts),
            'comparison_table_json' => $this->comparisonTable($societies),
            'society_summaries_json' => $this->societySummaries($societies),
            'recommendation_copy' => $this->recommendationCopy($facts),
            'faq_json' => $this->faq($ordered, $facts),
            'internal_links_json' => $societies->map(fn (Society $society) => [
                'label' => $society->name,
                'url' => "/society/{$society->slug}",
            ])->values()->all(),
            'score' => round($societies->avg(fn (Society $society) => (float) $society->score), 1),
            'content_quality_score' => round($quality, 1),
            'status' => SocietyComparePage::STATUS_NEEDS_REVIEW,
            'generated_by' => 'system',
            'ai_model' => null,
        ];
    }

    private function comparisonTable(Collection $societies): array
    {
        return [
            'columns' => $societies->map(fn (Society $society) => ['id' => $society->id, 'name' => $society->name, 'slug' => $society->slug])->values()->all(),
            'rows' => [
                $this->row('Sector', fn (Society $society) => $society->sector ?: 'Not enough verified data', $societies),
                $this->row('Locality', fn (Society $society) => $society->locality ?: 'Not enough verified data', $societies),
                $this->row('Builder', fn (Society $society) => $society->builder ?: 'Not enough verified data', $societies),
                $this->row('Project status', fn (Society $society) => $society->project_status ?: 'Not enough verified data', $societies),
                $this->row('Property type', fn (Society $society) => $society->society_type ?: 'Society profile', $societies),
                $this->row('Amenities', fn (Society $society) => $this->amenityCopy($society), $societies),
                $this->row('Nearby highlights', fn (Society $society) => $this->nearbyCopy($society), $societies),
                $this->row('Connectivity score', fn (Society $society) => $this->safeScore($society->connectivity_score), $societies),
                $this->row('Lifestyle score', fn (Society $society) => $this->safeScore($society->lifestyle_score), $societies),
                $this->row('Verified rent range', fn (Society $society) => $society->rent_range ? "Available verified range: {$society->rent_range}" : 'Not enough verified data', $societies),
                $this->row('Verified resale range', fn (Society $society) => $society->buy_range ? "Available verified range: {$society->buy_range}" : 'Not enough verified data', $societies),
                $this->row('Public profile', fn (Society $society) => "/society/{$society->slug}", $societies),
            ],
        ];
    }

    private function row(string $label, callable $value, Collection $societies): array
    {
        return [
            'label' => $label,
            'values' => $societies->map(fn (Society $society) => $value($society))->values()->all(),
        ];
    }

    private function societySummaries(Collection $societies): array
    {
        return $societies->map(fn (Society $society) => [
            'id' => $society->id,
            'name' => $society->name,
            'slug' => $society->slug,
            'sector' => $society->sector,
            'locality' => $society->locality,
            'builder' => $society->builder,
            'score' => (float) $society->score,
            'rent_range' => $society->rent_range,
            'buy_range' => $society->buy_range,
            'profile_url' => "/society/{$society->slug}",
        ])->values()->all();
    }

    /**
     * Every claim below quotes real published values (scores, verified rent/resale entries,
     * builders). Data-led copy keeps each page unique — identical boilerplate across dozens
     * of comparison pages reads as doorway pages to Google.
     *
     * @return array{scoreLeader:?Society,scores:array<int,float>,rentFloors:array<int,int>,cheapestRent:?Society,builders:array<int,string>,sameBuilder:bool}
     */
    private function facts(Collection $societies): array
    {
        $matcher = new \App\Services\Ai\SocietyMatchService();

        $scores = $societies->mapWithKeys(fn (Society $s) => [$s->id => (float) $s->score])->filter(fn ($v) => $v > 0)->all();
        arsort($scores);
        $topIds = array_keys($scores);
        $scoreLeader = count($scores) >= 2 && $scores[$topIds[0]] > $scores[$topIds[1]]
            ? $societies->firstWhere('id', $topIds[0])
            : null;

        $rentFloors = $societies->mapWithKeys(function (Society $s) use ($matcher) {
            $value = $matcher->priceFromText($s->rent_range ?: $s->average_rent);

            return [$s->id => ($value && $value >= 5000) ? $value : null];
        })->filter()->all();
        asort($rentFloors);
        $cheapestRent = count($rentFloors) >= 2
            ? $societies->firstWhere('id', array_key_first($rentFloors))
            : null;

        $builders = $societies->pluck('builder')->filter()->map(fn ($b) => trim((string) $b))->unique()->values()->all();

        return [
            'scoreLeader' => $scoreLeader,
            'scores' => $scores,
            'rentFloors' => $rentFloors,
            'cheapestRent' => $cheapestRent,
            'builders' => $builders,
            'sameBuilder' => count($builders) === 1 && $societies->every(fn (Society $s) => filled($s->builder)),
        ];
    }

    private function introCopy(Collection $societies, array $facts, string $sectorCluster, string $city): string
    {
        [$a, $b, $c] = [$societies[0], $societies[1], $societies[2]];
        $where = $sectorCluster ? "{$sectorCluster}, {$city}" : $city;

        $builderLine = $facts['sameBuilder']
            ? " All three are {$facts['builders'][0]} projects, so this comes down to location, pricing and community fit."
            : (count($facts['builders']) >= 2 ? ' Builders across this shortlist: '.implode(', ', $facts['builders']).'.' : '');

        return "{$a->name}, {$b->name} and {$c->name} are three verified societies in {$where}, compared side by side using admin-reviewed SocietyFlats data — overall scores, verified rent and resale ranges, amenities and location context (updated ".now()->format('F Y').').'.$builderLine;
    }

    private function summaryCopy(Collection $societies, array $facts): string
    {
        $parts = [];

        if ($facts['scoreLeader']) {
            $others = $societies->where('id', '!=', $facts['scoreLeader']->id)
                ->map(fn (Society $s) => number_format((float) $s->score, 1))->join(' and ');
            $parts[] = "{$facts['scoreLeader']->name} leads this comparison on overall SocietyFlats score (".number_format((float) $facts['scoreLeader']->score, 1)." vs {$others})";
        }

        if ($facts['cheapestRent']) {
            $parts[] = "verified rent entries start around {$this->formatRent($facts['rentFloors'][$facts['cheapestRent']->id])}/mo at {$facts['cheapestRent']->name}";
        }

        if ($parts === []) {
            $names = $societies->pluck('name')->join(', ', ' and ');

            return "Compare {$names} across sector, builder, amenities, verified market ranges and location scores.";
        }

        return ucfirst(implode('; ', $parts)).'. The full table below covers sector, builder, amenities and verified market ranges.';
    }

    private function recommendationCopy(array $facts): string
    {
        $lead = $facts['scoreLeader']
            ? "{$facts['scoreLeader']->name} scores highest here, but the right pick depends on budget and commute. "
            : '';

        return $lead.'Use this page as a shortlist aid, then request current verified availability before planning visits.';
    }

    private function metaDescription(Collection $societies, array $facts): string
    {
        [$a, $b, $c] = [$societies[0], $societies[1], $societies[2]];
        $scoreBit = $facts['scores'] !== []
            ? ' — scores '.collect($facts['scores'])->map(fn ($v) => number_format($v, 1))->join('/')
            : '';
        $rentBit = $facts['cheapestRent']
            ? ', rent from '.$this->formatRent($facts['rentFloors'][$facts['cheapestRent']->id]).'/mo'
            : '';

        return Str::limit("Compare {$a->name}, {$b->name} and {$c->name} side by side{$scoreBit}{$rentBit}, plus verified amenities, builders and market ranges on SocietyFlats.", 168, '.');
    }

    /**
     * One distinct, data-backed label per society — never the same generic tag three times.
     */
    private function bestFor(Collection $societies, array $facts): array
    {
        $assigned = [];
        $used = [];

        $claim = function (?Society $society, string $label) use (&$assigned, &$used) {
            if ($society && ! isset($assigned[$society->id]) && ! in_array($label, $used, true)) {
                $assigned[$society->id] = $label;
                $used[] = $label;
            }
        };

        $claim($facts['scoreLeader'], 'Highest overall score');
        $claim($facts['cheapestRent'], 'Lowest verified rent entry');

        foreach (['connectivity_score' => 'Best connectivity', 'lifestyle_score' => 'Best lifestyle'] as $field => $label) {
            $leader = $societies->filter(fn (Society $s) => (float) $s->{$field} > 0 && ! isset($assigned[$s->id]))
                ->sortByDesc(fn (Society $s) => (float) $s->{$field})->first();
            $claim($leader, $label);
        }

        return $societies->map(fn (Society $society) => [
            'society' => $society->name,
            'label' => $assigned[$society->id] ?? 'Worth shortlisting',
        ])->values()->all();
    }

    private function faq(Collection $societies, array $facts): array
    {
        $names = $societies->pluck('name')->join(', ', ' and ');
        $faqs = [];

        if ($facts['scoreLeader']) {
            $others = $societies->where('id', '!=', $facts['scoreLeader']->id)
                ->map(fn (Society $s) => $s->name.($s->score > 0 ? ' ('.number_format((float) $s->score, 1).')' : ''))->join(' and ');
            $answer = "{$facts['scoreLeader']->name} has the highest SocietyFlats overall score (".number_format((float) $facts['scoreLeader']->score, 1).") in this comparison, ahead of {$others}. The right choice still depends on budget, commute and current verified availability.";
        } else {
            $answer = 'The best fit depends on budget, commute, family needs and verified availability. This comparison shows published SocietyFlats data without inventing rankings.';
        }
        $faqs[] = ['question' => "Which society is best among {$names}?", 'answer' => $answer];

        if (count($facts['rentFloors']) >= 2) {
            $rentBits = $societies->filter(fn (Society $s) => isset($facts['rentFloors'][$s->id]))
                ->map(fn (Society $s) => "{$this->formatRent($facts['rentFloors'][$s->id])}/mo at {$s->name}")->join(', ', ' and ');
            $faqs[] = [
                'question' => 'Which is more affordable to rent — '.$societies->pluck('name')->join(', ', ' or ').'?',
                'answer' => "Verified rent ranges start around {$rentBits}. Ranges move with the market — request current availability before deciding.",
            ];
        }

        if ($facts['sameBuilder']) {
            $faqs[] = [
                'question' => 'Are these societies by the same builder?',
                'answer' => "Yes — all three are {$facts['builders'][0]} projects, so construction pedigree is comparable and the decision comes down to location, pricing and community.",
            ];
        } elseif (count($facts['builders']) >= 2) {
            $faqs[] = [
                'question' => 'Are these societies by the same builder?',
                'answer' => 'No. Builders in this comparison: '.implode(', ', $facts['builders']).'. Builder track record affects maintenance and resale, so weigh it alongside location.',
            ];
        }

        $faqs[] = [
            'question' => 'Can I compare other Gurgaon societies?',
            'answer' => 'Yes. Open the SocietyFlats AI Advisor or search page to build a custom shortlist.',
        ];

        return $faqs;
    }

    private function formatRent(int $value): string
    {
        return '₹'.number_format($value, 0, '.', ',');
    }

    private function qualityScore(Collection $societies): int
    {
        $score = 0;

        foreach ($societies as $society) {
            $score += $society->sector ? 6 : 0;
            $score += $society->locality ? 6 : 0;
            $score += $society->builder ? 5 : 0;
            $score += $society->score ? 5 : 0;
            $score += count($this->amenities($society)) >= 3 ? 5 : 0;
            $score += $society->description ? 3 : 0;
        }

        return min(100, $score);
    }

    private function tripletSignature(Collection $items): string
    {
        return $items->map(fn ($item) => $item instanceof Society ? $item->id : $item)->sort()->values()->join('-');
    }

    private function sameCity(Society $a, Society $b): bool
    {
        return $this->sameText($a->city ?: 'Gurgaon', $b->city ?: 'Gurgaon');
    }

    private function sameText(?string $a, ?string $b): bool
    {
        return Str::lower(trim((string) $a)) !== '' && Str::lower(trim((string) $a)) === Str::lower(trim((string) $b));
    }

    private function nearbySector(?string $a, ?string $b): bool
    {
        preg_match('/\d+/', (string) $a, $aMatch);
        preg_match('/\d+/', (string) $b, $bMatch);

        if (! $aMatch || ! $bMatch) {
            return false;
        }

        return abs((int) $aMatch[0] - (int) $bMatch[0]) <= 5;
    }

    private function amenities(Society $society): array
    {
        $amenities = $society->amenities ?: [];
        if (is_string($amenities)) {
            $decoded = json_decode($amenities, true);
            $amenities = is_array($decoded) ? $decoded : preg_split('/\r?\n|,/', $amenities);
        }

        return collect($amenities)->flatten()->map(fn ($item) => Str::lower(trim((string) $item)))->filter()->unique()->values()->all();
    }

    private function amenityCopy(Society $society): string
    {
        $amenities = $this->amenities($society);

        return $amenities ? collect($amenities)->take(6)->map(fn ($item) => Str::title($item))->join(', ') : 'Not enough verified data';
    }

    private function nearbyCopy(Society $society): string
    {
        $count = 0;
        foreach (['nearby_schools', 'nearby_metro', 'nearby_hospitals', 'nearby_office_hubs'] as $field) {
            $value = $society->{$field};
            if (is_array($value) && count($value)) $count++;
            if (is_string($value) && trim($value) !== '') $count++;
        }

        return $count > 0 ? "{$count} nearby categories available" : 'Not enough verified data';
    }

    private function safeScore($value): string
    {
        return $value ? number_format((float) $value, 1) : 'Not enough verified data';
    }
}
