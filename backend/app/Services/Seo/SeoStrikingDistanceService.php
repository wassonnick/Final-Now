<?php

namespace App\Services\Seo;

use App\Models\SeoPage;
use App\Models\SeoSearchConsoleMetric;
use App\Models\SeoTask;
use Illuminate\Support\Collection;

/**
 * The cheapest traffic available: pages that already rank, one page short.
 *
 * Search Console says 3,107 impressions a month sit at positions 11–20 — ranked, indexed,
 * and almost never clicked, because page two is not a place people go. Those pages need a
 * nudge, not new content, and the gain from nudging one is knowable in advance rather than
 * guessed at.
 *
 * The estimate uses this site's own observed click-through by position rather than a
 * published curve. Its queries are mostly society names where a builder or a portal holds
 * the top slots, so the industry averages overstate what a move is worth here by a wide
 * margin — better to be right about this site than optimistic about a generic one.
 */
class SeoStrikingDistanceService
{
    /** Ranked but on page two, or on page one and underperforming. */
    private const MIN_POSITION = 4.0;

    private const MAX_POSITION = 20.0;

    /** Below this, a move is noise rather than traffic. */
    private const MIN_IMPRESSIONS = 15;

    /** Where a nudge is realistically aiming. */
    private const TARGET_POSITION = 5.0;

    /**
     * Click-through this site actually achieves at each position band.
     *
     * @return array<string, float>
     */
    public function observedCtrByBand(int $days = 28): array
    {
        $since = now()->subDays($days)->startOfDay();
        $bands = ['1-3' => [1, 3], '4-10' => [4, 10], '11-20' => [11, 20], '21+' => [21, 999]];
        $curve = [];

        foreach ($bands as $label => [$low, $high]) {
            $row = SeoSearchConsoleMetric::query()
                ->where('metric_date', '>=', $since)
                ->whereBetween('position', [$low, $high])
                ->selectRaw('sum(impressions) as impressions, sum(clicks) as clicks')
                ->first();

            $impressions = (int) ($row->impressions ?? 0);
            $curve[$label] = $impressions > 0 ? (float) $row->clicks / $impressions : 0.0;
        }

        return $curve;
    }

    /**
     * What a page could earn by reaching the target position, highest first.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function opportunities(int $days = 28, int $limit = 40): Collection
    {
        $since = now()->subDays($days)->startOfDay();
        $curve = $this->observedCtrByBand($days);
        $targetCtr = max($curve['4-10'], $curve['1-3'], 0.02);

        return SeoSearchConsoleMetric::query()
            ->where('metric_date', '>=', $since)
            // Query rows describe one intent; the page-level pass carries no query and would
            // double-count the same impressions under a blank heading.
            ->whereNotNull('query')
            ->where('query', '!=', '')
            ->selectRaw('page_url, query, seo_page_id, sum(impressions) as impressions, sum(clicks) as clicks, avg(position) as position')
            ->groupBy('page_url', 'query', 'seo_page_id')
            ->havingRaw('sum(impressions) >= ?', [self::MIN_IMPRESSIONS])
            ->get()
            ->filter(fn ($row) => (float) $row->position >= self::MIN_POSITION
                && (float) $row->position <= self::MAX_POSITION)
            ->map(function ($row) use ($targetCtr) {
                $impressions = (int) $row->impressions;
                $clicks = (int) $row->clicks;
                $currentCtr = $impressions > 0 ? $clicks / $impressions : 0.0;

                return [
                    'page_url' => $row->page_url,
                    'seo_page_id' => $row->seo_page_id,
                    'query' => $row->query,
                    'position' => round((float) $row->position, 1),
                    'impressions' => $impressions,
                    'clicks' => $clicks,
                    'ctr' => round($currentCtr * 100, 2),
                    // Only ever a gain: a page already beating the target curve is not an
                    // opportunity, and should not be dressed up as one.
                    'potential_clicks' => (int) round($impressions * max(0, $targetCtr - $currentCtr)),
                    'gap' => $this->gap($row),
                ];
            })
            ->filter(fn (array $row) => $row['potential_clicks'] > 0)
            ->sortByDesc('potential_clicks')
            ->take($limit)
            ->values();
    }

    /**
     * Why this one is stuck, in the terms someone can act on.
     *
     * Deliberately concrete. "Improve SEO" is not a task; "the query is not in the title"
     * is something a person can do in a minute.
     */
    private function gap($row): string
    {
        $page = $row->seo_page_id ? SeoPage::find((int) $row->seo_page_id) : null;
        $query = mb_strtolower((string) $row->query);
        $reasons = [];

        if ($page) {
            $title = mb_strtolower((string) $page->title);
            $heading = mb_strtolower((string) $page->h1);

            if ($title !== '' && ! str_contains($title, $this->head($query))) {
                $reasons[] = 'the query is not in the title';
            }
            if ($heading !== '' && ! str_contains($heading, $this->head($query))) {
                $reasons[] = 'not reflected in the H1';
            }
            if ((int) $page->internal_link_count < 4) {
                $reasons[] = 'few internal links point at it';
            }
        }

        if ((float) $row->position > 10) {
            array_unshift($reasons, 'sits on page two');
        }

        return $reasons === [] ? 'ranks on page one but is rarely clicked' : implode(', ', $reasons);
    }

    /** The distinctive part of a query, ignoring the words every local search carries. */
    private function head(string $query): string
    {
        $words = array_values(array_filter(
            explode(' ', preg_replace('/[^a-z0-9 ]/', ' ', $query) ?? $query),
            fn ($word) => strlen($word) > 2 && ! in_array($word, ['the', 'for', 'in', 'gurgaon', 'gurugram', 'delhi', 'near'], true),
        ));

        return $words[0] ?? $query;
    }

    /**
     * Record the top opportunities as tasks so they appear beside the rest of the work.
     *
     * A reconciler has been closing `gsc_striking_distance` tasks for some time, but
     * nothing ever opened one — the handful showing in admin were stale rows from an
     * earlier version, which is why the highest-value work in the whole system was
     * invisible.
     */
    public function recordTasks(int $days = 28, int $limit = 25): int
    {
        $recorded = 0;

        foreach ($this->opportunities($days, $limit) as $opportunity) {
            if (! $opportunity['seo_page_id']) {
                continue;
            }

            SeoTask::updateOrCreate(
                [
                    'seo_page_id' => $opportunity['seo_page_id'],
                    'task_type' => 'gsc_striking_distance',
                    'status' => 'open',
                ],
                [
                    'priority' => $opportunity['potential_clicks'] >= 5 ? 'high' : 'medium',
                    'title' => sprintf('“%s” is at position %s', $opportunity['query'], $opportunity['position']),
                    'description' => sprintf(
                        '%d impressions a month, %d clicks. Roughly %d more clicks if it reaches the top five — %s.',
                        $opportunity['impressions'],
                        $opportunity['clicks'],
                        $opportunity['potential_clicks'],
                        $opportunity['gap'],
                    ),
                    'source' => 'search_console',
                    'metadata' => $opportunity,
                ],
            );

            $recorded++;
        }

        return $recorded;
    }
}
