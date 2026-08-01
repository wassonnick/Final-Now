<?php

namespace App\Services\Ncr;

use App\Models\City;
use App\Models\NcrCityLaunchApproval;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class NcrCityLaunchPolicy
{
    public function isIndexingEnabled(): bool
    {
        return (bool) config('features.ncr_city_indexing', false);
    }

    /**
     * @return array<int,string>
     */
    public function approvedSlugs(): array
    {
        if (! $this->isIndexingEnabled()) {
            return [];
        }

        return collect($this->envApprovedSlugs())
            ->merge($this->dbApprovedSlugs())
            ->map(fn ($slug) => Str::slug((string) $slug))
            ->filter()
            ->unique()
            ->values()
            ->all();
    }

    /**
     * May a society in this city be published to the public site?
     *
     * Distinct from cityIsApproved(), which answers a narrower question about indexing
     * and sitemaps. The home city is live by definition; an NCR expansion city is not
     * live until it has been approved, and publishing into one produces the state that
     * exposed this: a society reachable on the public site while its own city page still
     * says the city is launching.
     */
    public function cityMayPublish(City|string|null $city): bool
    {
        if ($city === null) {
            // Legacy rows with no city link are Gurgaon; never block them.
            return true;
        }

        $slug = Str::slug((string) ($city instanceof City ? $city->slug : $city));

        if ($slug === '') {
            return true;
        }

        $home = collect((array) config('features.home_city_slugs', []))
            ->map(fn ($value) => Str::slug((string) $value))
            ->all();

        if (in_array($slug, $home, true)) {
            return true;
        }

        // Publishing approval is the lower, separate bar: a city can be open and working
        // while still held back from indexing until it has the content depth for it.
        return $this->cityIsOpenForPublishing($slug) || $this->cityIsApproved($slug);
    }

    /**
     * Has this city been explicitly opened for publishing?
     *
     * Deliberately independent of the NCR indexing flag: opening a city is an editorial
     * decision about whether it is ready for visitors, and holding it hostage to a global
     * SEO switch is what made the first society in a new city unpublishable.
     */
    public function cityIsOpenForPublishing(City|string $city): bool
    {
        if (! Schema::hasTable('ncr_city_launch_approvals')) {
            return false;
        }

        $slug = Str::slug((string) ($city instanceof City ? $city->slug : $city));

        return NcrCityLaunchApproval::query()
            ->where('city_slug', $slug)
            ->where('approved_for_publishing', true)
            ->whereNull('revoked_at')
            ->exists();
    }

    public function cityIsApproved(City|string $city): bool
    {
        $slug = $city instanceof City ? $city->slug : $city;

        return in_array(Str::slug((string) $slug), $this->approvedSlugs(), true);
    }

    /**
     * @return array<int,string>
     */
    public function envApprovedSlugs(): array
    {
        return collect((array) config('features.ncr_indexable_city_slugs', []))
            ->map(fn ($slug) => Str::slug((string) $slug))
            ->filter()
            ->values()
            ->all();
    }

    /**
     * @return array<int,string>
     */
    public function dbApprovedSlugs(): array
    {
        if (! Schema::hasTable('ncr_city_launch_approvals')) {
            return [];
        }

        return NcrCityLaunchApproval::query()
            ->where('status', 'approved')
            ->where('approved_for_indexing', true)
            ->where('approved_for_sitemap', true)
            ->whereNull('revoked_at')
            ->pluck('city_slug')
            ->map(fn ($slug) => Str::slug((string) $slug))
            ->filter()
            ->values()
            ->all();
    }
}
