<?php

namespace App\Services\Seo;

use App\Models\SeoKeyword;
use App\Models\SeoSearchConsoleMetric;
use Illuminate\Support\Collection;

/**
 * The queries we are not in the running for at all.
 *
 * Search Console can only report what a site already appears for, so a striking-distance
 * report is blind to everything worse than that. It found 22 winnable clicks — a real
 * number, and a small one — precisely because it could only see the pages already ranking.
 *
 * This is the other half: keywords the site targets, cross-referenced against what Google
 * has ever shown it for. A keyword with zero impressions is not ranking badly, it is
 * absent, and the two need opposite responses — one wants a nudge, the other wants a
 * reason to exist.
 */
class SeoCoverageGapService
{
    /** Below this a keyword has appeared enough to be a ranking problem, not a gap. */
    private const SEEN_THRESHOLD = 1;

    /**
     * Every mapped keyword, split by whether Google has ever shown the site for it.
     *
     * @return array{seen: Collection<int, array<string, mixed>>, absent: Collection<int, array<string, mixed>>}
     */
    public function split(int $days = 28): array
    {
        $since = now()->subDays($days)->startOfDay();

        // One pass over the window, held in memory. Matching per keyword would be 4,000
        // queries against a table the nightly import keeps growing.
        $impressions = SeoSearchConsoleMetric::query()
            ->where('metric_date', '>=', $since)
            ->where('query', '!=', '')
            ->selectRaw('lower(query) as q, sum(impressions) as impressions, sum(clicks) as clicks, avg(position) as position')
            ->groupBy('q')
            ->get()
            ->keyBy('q');

        $seen = collect();
        $absent = collect();

        foreach (SeoKeyword::query()->with('page:id,url,page_type')->get() as $keyword) {
            $term = mb_strtolower(trim((string) $keyword->keyword));
            if ($term === '') {
                continue;
            }

            $row = $impressions->get($term);
            $entry = [
                'keyword' => $term,
                'cluster' => $keyword->cluster_type,
                'intent' => $keyword->intent,
                'url' => $keyword->suggested_url ?: optional($keyword->page)->url,
                'impressions' => (int) ($row->impressions ?? 0),
                'clicks' => (int) ($row->clicks ?? 0),
                'position' => $row ? round((float) $row->position, 1) : null,
            ];

            if ($entry['impressions'] >= self::SEEN_THRESHOLD) {
                $seen->push($entry);
            } else {
                $absent->push($entry);
            }
        }

        return [
            'seen' => $seen->sortByDesc('impressions')->values(),
            'absent' => $absent->values(),
        ];
    }

    /**
     * Where the gaps cluster, which is the only actionable view of four thousand of them.
     *
     * A list of 4,000 missing keywords is not a plan. Grouped by page type it says
     * something a person can act on: whether a whole class of page is invisible, or only
     * scattered individual terms are.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function summary(int $days = 28): Collection
    {
        $split = $this->split($days);
        $seen = $split['seen']->groupBy('cluster');
        $absent = $split['absent']->groupBy('cluster');

        return collect($seen->keys()->merge($absent->keys())->unique())
            ->map(function (string $cluster) use ($seen, $absent) {
                $seenCount = $seen->get($cluster, collect())->count();
                $absentCount = $absent->get($cluster, collect())->count();
                $total = $seenCount + $absentCount;

                return [
                    'cluster' => $cluster ?: '(unclustered)',
                    'targeted' => $total,
                    'appearing' => $seenCount,
                    'absent' => $absentCount,
                    'coverage' => $total > 0 ? round($seenCount / $total * 100, 1) : 0.0,
                    'impressions' => $seen->get($cluster, collect())->sum('impressions'),
                ];
            })
            ->sortByDesc('targeted')
            ->values();
    }

    /**
     * Gaps worth naming individually: absent keywords on page types that do rank elsewhere.
     *
     * If a page type appears for nothing at all the problem is the page type, not the
     * keyword. It is the missing terms sitting beside successful ones that point at
     * something specific and fixable.
     *
     * @return Collection<int, array<string, mixed>>
     */
    public function actionable(int $days = 28, int $limit = 30): Collection
    {
        $split = $this->split($days);
        $working = $split['seen']->groupBy('cluster')->map->count();

        return $split['absent']
            ->filter(fn (array $row) => ($working[$row['cluster']] ?? 0) >= 3)
            // Longer keywords are the specific, winnable ones; a bare head term absent from
            // the index is absent for reasons no page edit will fix.
            ->sortByDesc(fn (array $row) => str_word_count($row['keyword']))
            ->take($limit)
            ->values();
    }
}
