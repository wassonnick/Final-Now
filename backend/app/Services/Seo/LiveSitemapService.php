<?php

namespace App\Services\Seo;

use App\Models\SeoPage;
use Illuminate\Support\Facades\Cache;

/**
 * Single source of truth for the live, DB-driven sitemap. The public route serves a
 * 1-hour cached copy; the technical audit validates against a freshly generated copy so
 * a page published this minute is never falsely reported "missing from the sitemap".
 */
class LiveSitemapService
{
    public const CACHE_KEY = 'seo:live-sitemap:v2';

    public function base(): string
    {
        $configuredBase = (string) config('services.search_console.site_url', 'https://www.societyflats.com');

        return str_starts_with($configuredBase, 'http')
            ? rtrim($configuredBase, '/')
            : rtrim((string) config('services.lead_notifications.frontend_url', 'https://www.societyflats.com'), '/');
    }

    /** @return \Illuminate\Support\Collection<int,\App\Models\SeoPage> */
    public function includedPages()
    {
        $allowedNcrCities = collect((array) config('features.ncr_indexable_city_slugs', []))
            ->map(fn ($slug) => trim((string) $slug))
            ->filter()
            ->map(fn ($slug) => '/ncr/'.\Illuminate\Support\Str::slug($slug))
            ->values()
            ->all();

        return SeoPage::where('is_public', true)
            ->where('is_indexable', true)
            ->where('sitemap_included', true)
            ->where(function ($query) use ($allowedNcrCities) {
                $query->where('url', 'not like', '/ncr/%');

                if ((bool) config('features.ncr_city_indexing', false) && count($allowedNcrCities) > 0) {
                    $query->orWhereIn('url', $allowedNcrCities);
                }
            })
            ->orderBy('url')
            ->get(['canonical_url', 'url', 'freshness_at']);
    }

    public function body(): string
    {
        $base = $this->base();
        $lines = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
        foreach ($this->includedPages() as $page) {
            $loc = $base.($page->canonical_url ?: $page->url);
            $lines[] = '  <url><loc>'.htmlspecialchars($loc, ENT_XML1).'</loc>'
                .($page->freshness_at ? '<lastmod>'.$page->freshness_at->toDateString().'</lastmod>' : '')
                .'</url>';
        }
        $lines[] = '</urlset>';

        return implode("\n", $lines);
    }

    public function cached(): string
    {
        return Cache::remember(self::CACHE_KEY, now()->addHour(), fn () => $this->body());
    }

    public function flushCache(): void
    {
        Cache::forget(self::CACHE_KEY);
    }
}
