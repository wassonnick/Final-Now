<?php

namespace App\Services\Seo;

use App\Models\SeoPage;
use App\Services\Ncr\NcrCityLaunchPolicy;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Single source of truth for the live, DB-driven sitemap. The public route serves a
 * 1-hour cached copy; the technical audit validates against a freshly generated copy so
 * a page published this minute is never falsely reported "missing from the sitemap".
 */
class LiveSitemapService
{
    public const CACHE_KEY = 'seo:live-sitemap:v2';

    /**
     * The host every <loc> is built on.
     *
     * This must be the site's canonical host, not merely whatever is configured. In
     * production the Search Console property was set to the apex (societyflats.com)
     * while the site itself canonicalises to www and 301s the apex — so every URL in
     * this sitemap was a cross-host redirect, and search engines discard those rather
     * than index them. Normalising here fixes it without depending on an env var
     * staying correct.
     */
    public function base(): string
    {
        $configuredBase = (string) config('services.search_console.site_url', 'https://www.societyflats.com');

        $base = str_starts_with($configuredBase, 'http')
            ? rtrim($configuredBase, '/')
            : rtrim((string) config('services.lead_notifications.frontend_url', 'https://www.societyflats.com'), '/');

        return $this->canonicalHost($base);
    }

    /**
     * Upgrade our own apex to www. Deliberately narrow: preview and local hosts are
     * left exactly as configured, so this only ever corrects the one host we know
     * redirects.
     */
    private function canonicalHost(string $base): string
    {
        return preg_replace('#^https?://societyflats\.com#i', 'https://www.societyflats.com', $base) ?: $base;
    }

    /** @return \Illuminate\Support\Collection<int,\App\Models\SeoPage> */
    public function includedPages()
    {
        $policy = app(NcrCityLaunchPolicy::class);
        $allowedNcrCities = collect($policy->approvedSlugs())
            ->map(fn ($slug) => trim((string) $slug))
            ->filter()
            ->map(fn ($slug) => '/ncr/'.Str::slug($slug))
            ->values()
            ->all();

        return SeoPage::where('is_public', true)
            ->where('is_indexable', true)
            ->where('sitemap_included', true)
            ->where(function ($query) use ($allowedNcrCities, $policy) {
                $query->where('url', 'not like', '/ncr/%');

                if ($policy->isIndexingEnabled() && count($allowedNcrCities) > 0) {
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
