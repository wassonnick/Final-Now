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

    /**
     * Cities whose inventory must not appear on the public site yet.
     *
     * cityMayPublish() gates the moment of publishing and nothing gated the reading, so a
     * Delhi society published before its city was ready stayed visible in a catalogue whose
     * own header says "Gurgaon" — Paschim Vihar flats returned by a Gurgaon search.
     *
     * A city is hidden unless it is the home city or has been approved for indexing, which
     * is the same bar the market map calls "live". Cities with no launch record at all are
     * hidden too: absence of approval is not approval.
     *
     * @return array{ids: array<int,int>, names: array<int,string>}
     */
    public function hiddenCities(): array
    {
        $home = collect((array) config('features.home_city_slugs', []))
            ->map(fn ($value) => Str::slug((string) $value))
            ->all();

        $hidden = City::query()
            ->get(['id', 'name', 'slug'])
            ->reject(fn (City $city) => in_array(Str::slug((string) $city->slug), $home, true) || $this->cityIsApproved($city));

        return [
            'ids' => $hidden->pluck('id')->map(fn ($id) => (int) $id)->all(),
            'names' => $hidden->pluck('name')->filter()->map(fn ($n) => (string) $n)->all(),
        ];
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
