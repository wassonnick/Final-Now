<?php

namespace App\Services\Seo;

use App\Models\Landmark;
use App\Models\Society;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;

/**
 * "Societies near Cyber Hub" — the one page type nobody else in this market can build.
 *
 * Portals list inventory; they cannot tell you that a society is 460 metres from where you
 * work, because they hold no coordinates for either end. We hold both, so these pages
 * answer a high-intent query with a measured number instead of an adjective — which is
 * also the only kind of programmatic page worth publishing, since every row on it is a
 * fact rather than filler.
 */
class LandmarkPageService
{
    /** Far enough to still be a real commute, close enough for "near" to mean something. */
    public const RADIUS_KM = 8.0;

    /** Below this a page has nothing to say, and an empty page is worse than no page. */
    public const MIN_SOCIETIES = 3;

    private const MAX_SOCIETIES = 24;

    /**
     * Loaded once per request, not once per landmark.
     *
     * `nearby()` re-queried every published society each time it was called, and it is
     * called once per landmark by `publishable()`, again by `siblings()`, and again for
     * every candidate on a society page. That turned one page into thirty-odd full table
     * loads — the landmark index took 59 seconds in production and every society detail
     * request paid a share of it.
     */
    private ?Collection $societyCache = null;

    private ?Collection $publishableCache = null;

    private function publishedSocieties(): Collection
    {
        return $this->societyCache ??= Society::query()
            ->where('is_published', true)
            ->whereIn('status', ['Verified', 'Premium'])
            ->inLiveCities()
            ->whereNotNull('latitude')
            ->whereNotNull('longitude')
            ->get();
    }

    /**
     * Landmarks that can carry a page of their own.
     *
     * @return Collection<int, Landmark>
     */
    public function publishable(): Collection
    {
        if ($this->publishableCache !== null) {
            return $this->publishableCache;
        }

        /**
         * Cached across requests, keyed on the data it was computed from.
         *
         * Working this out means measuring every landmark against every published society,
         * and `forSociety()` needs it on every society page view — 5.4 seconds a page once
         * it was wired in. The key carries a fingerprint of the catalogue, so a new society
         * or landmark produces a new key rather than a stale answer, and tests with
         * different fixtures never share one.
         */
        $ids = Cache::remember('seo:landmarks:publishable:'.$this->fingerprint(), now()->addHours(6), fn () => Landmark::query()
            ->orderBy('city')
            ->orderBy('name')
            ->get()
            ->filter(fn (Landmark $landmark) => $this->nearby($landmark)->count() >= self::MIN_SOCIETIES)
            ->pluck('id')
            ->all());

        return $this->publishableCache = Landmark::query()
            ->whereIn('id', $ids ?: [0])
            ->orderBy('city')
            ->orderBy('name')
            ->get();
    }

    /** Changes whenever the catalogue does, so the cache can never serve a stale list. */
    private function fingerprint(): string
    {
        return implode('-', [
            Landmark::query()->count(),
            Society::query()->where('is_published', true)->count(),
            (string) Society::query()->where('is_published', true)->max('updated_at'),
        ]);
    }

    /**
     * Published societies within range, nearest first, each carrying its real distance.
     *
     * @return Collection<int, Society>
     */
    public function nearby(Landmark $landmark, ?float $radiusKm = null): Collection
    {
        $radius = $radiusKm ?? self::RADIUS_KM;

        return $this->publishedSocieties()
            ->map(function (Society $society) use ($landmark) {
                // Cloned, because the society list is now shared across every call. Writing
                // the distance onto the shared instance meant siblings() — which measures
                // the same societies against other landmarks — silently overwrote the
                // distances the caller was about to serialise.
                $measured = clone $society;
                $measured->setAttribute('distance_km', $landmark->distanceTo(
                    is_numeric($society->latitude) ? (float) $society->latitude : null,
                    is_numeric($society->longitude) ? (float) $society->longitude : null,
                ));

                return $measured;
            })
            ->filter(fn (Society $society) => $society->getAttribute('distance_km') !== null
                && $society->getAttribute('distance_km') <= $radius)
            ->sortBy(fn (Society $society) => [$society->getAttribute('distance_km'), -(float) $society->score])
            ->take(self::MAX_SOCIETIES)
            ->values();
    }

    /**
     * The landmark pages a given society appears on, nearest first.
     *
     * The inverse of `nearby()`, and the link that makes these pages findable: a society
     * page saying "2.8 km from Cyber Hub" should be able to send you to everything else
     * near Cyber Hub. Only landmarks that actually have a page are returned, so the link
     * can never point at a 404.
     *
     * @return list<array{name: string, slug: string, distance_km: float, label: string}>
     */
    public function forSociety(Society $society, int $limit = 3): array
    {
        $latitude = is_numeric($society->latitude) ? (float) $society->latitude : null;
        $longitude = is_numeric($society->longitude) ? (float) $society->longitude : null;

        if ($latitude === null || $longitude === null) {
            return [];
        }

        // Only landmarks that already have a page, computed once and reused.
        return $this->publishable()
            ->map(fn (Landmark $landmark) => [
                'landmark' => $landmark,
                'distance_km' => $landmark->distanceTo($latitude, $longitude),
            ])
            ->filter(fn (array $row) => $row['distance_km'] !== null && $row['distance_km'] <= self::RADIUS_KM)
            ->sortBy('distance_km')
            ->take($limit)
            ->map(fn (array $row) => [
                'name' => $row['landmark']->name,
                'slug' => $row['landmark']->slug,
                'distance_km' => $row['distance_km'],
                'label' => $this->readable($row['distance_km']).' from '.$row['landmark']->name,
            ])
            ->values()
            ->all();
    }

    /**
     * Other landmark pages in the same city, so these pages form a cluster rather than a
     * set of dead ends.
     *
     * @return list<array{name: string, slug: string}>
     */
    public function siblings(Landmark $landmark, int $limit = 6): array
    {
        return $this->publishable()
            ->filter(fn (Landmark $other) => $other->id !== $landmark->id
                && ($other->city === $landmark->city || $landmark->city === null))
            ->take($limit)
            ->map(fn (Landmark $other) => ['name' => $other->name, 'slug' => $other->slug])
            ->values()
            ->all();
    }

    /**
     * Everything a landing page needs, written once so the page, the prerenderer and the
     * SEO registry all describe the same thing.
     */
    public function payload(Landmark $landmark): array
    {
        $societies = $this->nearby($landmark);
        $walkable = $societies->filter(fn ($s) => $s->getAttribute('distance_km') <= 2)->count();
        $nearest = $societies->first();

        return [
            'landmark' => [
                'name' => $landmark->name,
                'slug' => $landmark->slug,
                'category' => $landmark->category,
                'city' => $landmark->city,
                'latitude' => (float) $landmark->latitude,
                'longitude' => (float) $landmark->longitude,
            ],
            'radius_km' => self::RADIUS_KM,
            'title' => $this->title($landmark),
            'meta_description' => $this->description($landmark, $societies),
            'h1' => 'Verified societies near '.$landmark->name,
            'intro' => $this->intro($landmark, $societies, $walkable, $nearest),
            'society_count' => $societies->count(),
            'siblings' => $this->siblings($landmark),
            'walkable_count' => $walkable,
            'societies' => $societies->map(fn (Society $society) => [
                'id' => $society->id,
                'name' => $society->name,
                'slug' => $society->slug,
                'sector' => $society->sector,
                'locality' => $society->locality,
                'city' => $society->city,
                'score' => $society->score,
                'builder' => $society->builder,
                'rent_range' => $society->rent_range,
                'buy_range' => $society->buy_range,
                'cover_image' => $society->cover_image,
                'image_url' => $society->image_url,
                'image_photo_reference' => $society->image_photo_reference,
                'image_alt_text' => $society->image_alt_text,
                'distance_km' => $society->getAttribute('distance_km'),
            ])->all(),
        ];
    }

    /** Kept inside the audit's own band so these pages never join the backlog. */
    public function title(Landmark $landmark): string
    {
        $title = 'Societies Near '.$landmark->name.' — Verified, With Distances';

        return mb_strlen($title) <= SeoMechanicalRepairService::TITLE_MAX
            ? $title
            : 'Societies Near '.$landmark->name;
    }

    private function description(Landmark $landmark, Collection $societies): string
    {
        $nearest = $societies->first();
        $distance = $nearest ? $this->readable($nearest->getAttribute('distance_km')) : null;

        // Built up rather than cut down: a description assembled to length never truncates
        // mid-word, which is what "…on Soci…" was doing to the brand name.
        $text = sprintf(
            '%d verified societies within %d km of %s, ranked by measured distance%s.',
            $societies->count(),
            (int) self::RADIUS_KM,
            $landmark->name,
            $distance ? ' — the closest is '.$distance.' away' : '',
        );

        foreach ([' Real rent and resale ranges on SocietyFlats.', ' Verified on SocietyFlats.'] as $tail) {
            if (mb_strlen($text.$tail) <= SeoMechanicalRepairService::DESCRIPTION_MAX) {
                return $text.$tail;
            }
        }

        return $text;
    }

    private function intro(Landmark $landmark, Collection $societies, int $walkable, ?Society $nearest): string
    {
        $city = $landmark->city ?: 'Delhi NCR';
        $parts = [sprintf(
            'These %d verified societies sit within %d km of %s in %s. Distances are measured from real coordinates, not estimated from the locality name, and the list is ordered by how far each one actually is.',
            $societies->count(),
            (int) self::RADIUS_KM,
            $landmark->name,
            $city,
        )];

        if ($nearest) {
            $parts[] = sprintf(
                'The closest is %s in %s, %s away.',
                $nearest->name,
                $nearest->sector ?: $nearest->locality ?: $city,
                $this->readable($nearest->getAttribute('distance_km')),
            );
        }

        if ($walkable > 0) {
            $parts[] = sprintf('%d of them are within 2 km — close enough to walk or take an auto.', $walkable);
        }

        return implode(' ', $parts);
    }

    public function readable(?float $km): string
    {
        if ($km === null) {
            return '';
        }

        return $km < 1 ? round($km * 1000).' m' : number_format($km, 1).' km';
    }
}
