<?php

namespace App\Services\Ops;

use App\Models\Lead;
use App\Models\SiteVisit;
use App\Models\Society;
use App\Models\SocietySeoContent;
use Illuminate\Support\Facades\Http;

/**
 * Builds the admin Action Inbox report: every routine "is anything wrong /
 * waiting on a human?" check in one place. Read-only — this service never
 * mutates data, publishes, or approves anything.
 */
class AdminOpsInboxService
{
    private const LIST_CAP = 25;
    private const CONFIDENCE_FLOOR = 60;
    private const STALE_DAYS = 90;
    private const LEAD_SLA_HOURS = 24;
    private const LEAD_ESCALATION_HOURS = 72;

    public function build(bool $includeSitemap = true): array
    {
        return [
            'generated_at' => now()->toIso8601String(),
            'societies' => $this->societyQuality(),
            'sitemap' => $includeSitemap ? $this->sitemapDrift() : ['status' => 'skipped'],
            'leads' => $this->leadSla(),
            'site_visits' => $this->siteVisits(),
        ];
    }

    /** A1 — published-society data-quality sweep. */
    private function societyQuality(): array
    {
        $published = Society::query()
            ->where('is_published', true)
            ->get(['id', 'name', 'slug', 'source_confidence_score', 'image_approved_by_admin', 'updated_at', 'rent_range', 'buy_range']);

        $seoPublished = SocietySeoContent::query()
            ->where('status', 'published')
            ->pluck('society_id')
            ->all();

        $placeholder = fn ($value) => trim((string) $value) === '' || strcasecmp(trim((string) $value), 'To be verified') === 0;

        $lowConfidence = $published->filter(fn ($s) => (int) $s->source_confidence_score < self::CONFIDENCE_FLOOR);
        $missingCover = $published->filter(fn ($s) => ! $s->image_approved_by_admin);
        $missingSeo = $published->filter(fn ($s) => ! in_array($s->id, $seoPublished, true));
        $stale = $published->filter(fn ($s) => $s->updated_at && $s->updated_at->lt(now()->subDays(self::STALE_DAYS)));
        $missingMarket = $published->filter(fn ($s) => $placeholder($s->rent_range) && $placeholder($s->buy_range));

        $item = fn ($s) => ['id' => $s->id, 'name' => $s->name, 'slug' => $s->slug];

        return [
            'published_total' => $published->count(),
            'low_confidence' => [
                'count' => $lowConfidence->count(),
                'items' => $lowConfidence->take(self::LIST_CAP)->map(fn ($s) => $item($s) + ['confidence' => (int) $s->source_confidence_score])->values()->all(),
            ],
            'missing_cover' => [
                'count' => $missingCover->count(),
                'items' => $missingCover->take(self::LIST_CAP)->map($item)->values()->all(),
            ],
            'missing_published_seo' => [
                'count' => $missingSeo->count(),
                'items' => $missingSeo->take(self::LIST_CAP)->map($item)->values()->all(),
            ],
            'stale_over_90d' => [
                'count' => $stale->count(),
                'items' => $stale->take(self::LIST_CAP)->map(fn ($s) => $item($s) + ['updated_at' => optional($s->updated_at)->toDateString()])->values()->all(),
            ],
            'missing_market_data' => [
                'count' => $missingMarket->count(),
                'items' => $missingMarket->take(self::LIST_CAP)->map($item)->values()->all(),
            ],
        ];
    }

    /** A2 — live sitemap vs published societies drift check. */
    private function sitemapDrift(): array
    {
        $url = (string) config('services.ops.sitemap_url', 'https://www.societyflats.com/sitemap.xml');

        try {
            $response = Http::timeout(10)->get($url);
        } catch (\Throwable) {
            return ['status' => 'unreachable', 'url' => $url];
        }

        if (! $response->successful()) {
            return ['status' => 'unreachable', 'url' => $url, 'http_status' => $response->status()];
        }

        preg_match_all('#<loc>([^<]+)</loc>#', (string) $response->body(), $matches);
        $locs = $matches[1] ?? [];
        $sitemapSlugs = collect($locs)
            ->map(fn ($loc) => preg_match('#/society/([^/?\#]+)#', $loc, $m) ? $m[1] : null)
            ->filter()
            ->values();

        $publishedSlugs = Society::query()->where('is_published', true)->pluck('slug');

        $missing = $publishedSlugs->diff($sitemapSlugs)->values();
        $unknown = $sitemapSlugs->diff($publishedSlugs)->values();
        $propertyUrls = collect($locs)->filter(fn ($loc) => str_contains($loc, '/property/'))->count();

        return [
            'status' => ($missing->isEmpty() && $unknown->isEmpty()) ? 'ok' : 'drift',
            'url' => $url,
            'sitemap_total_urls' => count($locs),
            'sitemap_society_urls' => $sitemapSlugs->count(),
            'published_societies' => $publishedSlugs->count(),
            'property_detail_urls' => $propertyUrls,
            'published_missing_from_sitemap' => $missing->take(self::LIST_CAP)->all(),
            'sitemap_urls_not_published' => $unknown->take(self::LIST_CAP)->all(),
        ];
    }

    /** A5 — leads still New past the response SLA. */
    private function leadSla(): array
    {
        $breaches = Lead::query()
            ->where('status', 'New')
            ->where('created_at', '<=', now()->subHours(self::LEAD_SLA_HOURS))
            ->orderBy('created_at')
            ->get(['id', 'name', 'source', 'society_name', 'created_at']);

        $escalations = $breaches->filter(fn ($lead) => $lead->created_at->lte(now()->subHours(self::LEAD_ESCALATION_HOURS)));

        $item = fn ($lead) => [
            'id' => $lead->id,
            'name' => $lead->name,
            'source' => $lead->source,
            'society_name' => $lead->society_name,
            'waiting_hours' => (int) $lead->created_at->diffInHours(now()),
        ];

        return [
            'sla_hours' => self::LEAD_SLA_HOURS,
            'breaches' => [
                'count' => $breaches->count(),
                'items' => $breaches->take(self::LIST_CAP)->map($item)->values()->all(),
            ],
            'escalations_over_72h' => [
                'count' => $escalations->count(),
                'items' => $escalations->take(self::LIST_CAP)->map($item)->values()->all(),
            ],
        ];
    }

    /** A6 context — confirmed visits coming up and reminders still due. */
    private function siteVisits(): array
    {
        $upcoming = SiteVisit::query()
            ->where('status', 'confirmed')
            ->whereNotNull('selected_slot')
            ->whereBetween('selected_slot', [now(), now()->addHours(48)])
            ->get(['id', 'visitor_name', 'selected_slot', 'reminder_sent_at']);

        $dueReminders = $upcoming->filter(fn ($visit) => $visit->reminder_sent_at === null);

        return [
            'upcoming_48h' => $upcoming->count(),
            'reminders_due' => $dueReminders->count(),
            'items' => $dueReminders->take(self::LIST_CAP)->map(fn ($visit) => [
                'id' => $visit->id,
                'visitor_name' => $visit->visitor_name,
                'selected_slot' => optional($visit->selected_slot)->toIso8601String(),
            ])->values()->all(),
        ];
    }
}
