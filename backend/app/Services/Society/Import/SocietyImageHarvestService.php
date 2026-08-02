<?php

namespace App\Services\Society\Import;

use Illuminate\Support\Facades\Http;

/**
 * Stage 6 of the importer: collect image CANDIDATES from multiple sources.
 *
 *  - Official project / developer URL: og:image + in-page gallery images
 *    (direct, previewable URLs). Highest quality; developer copyright, so each
 *    starts un-approved behind a rights-confirmation gate.
 *  - Google Places: photo references passed through as cover candidates
 *    (served via the existing publish-gated photo proxy after approval).
 *
 * Nothing here is ever public: every candidate is approved=false and the gallery
 * only renders once the candidate is approved AND the society is published.
 */
class SocietyImageHarvestService
{
    public function __construct(
        private readonly OfficialSourceValidator $official,
        private readonly \App\Services\GoogleStreetViewService $streetView,
    ) {
    }

    private const MAX_CANDIDATES = 12;
    private const PER_URL_LIMIT = 8;

    /** Slots held for Google Places so an official site cannot take the whole budget. */
    private const PLACES_RESERVE = 5;

    /** Anything narrower is a thumbnail or a cropped sign, never a usable cover. */
    private const MIN_USABLE_WIDTH = 640;

    /**
     * @param  array{name?:string, builder?:?string, urls?:array<int,?string>, photo_references?:array<int,string>, photo_meta?:array<string,array{width?:int,height?:int,attribution?:?string}>, place_id?:string}  $ctx
     * @return array<int,array<string,mixed>>
     */
    public function harvest(array $ctx, ?array &$report = null): array
    {
        $candidates = [];
        $official = [];
        $places = [];
        // Why a harvest came back thin is the question an admin actually needs answered,
        // and "nothing usable found" answers none of it. Record each source's fate.
        $report = [
            'urls_seen' => 0,
            'urls_official' => [],
            'urls_rejected' => [],
            'official_images' => 0,
            'place_photos_offered' => count((array) ($ctx['photo_references'] ?? [])),
            'place_photos_too_small' => 0,
            'place_photos_kept' => 0,
            'images_unreachable' => 0,
        ];
        $builder = $ctx['builder'] ?? null;
        $societyName = $ctx['name'] ?? null;

        // The developer's own site beats a crowd-sourced map every time: those are
        // marketing photographs of the right building. But only when the domain really
        // belongs to the developer — an aggregator microsite carrying the project name
        // is a worse source than Google Places, because it looks authoritative.
        foreach (array_unique(array_filter((array) ($ctx['urls'] ?? []))) as $url) {
            $report['urls_seen']++;

            if (! $this->official->isOfficial((string) $url, $builder, $societyName)) {
                $report['urls_rejected'][] = (string) $url;

                continue;
            }

            $report['urls_official'][] = (string) $url;

            foreach ($this->fromUrl((string) $url) as $candidate) {
                // Source name is unchanged for existing consumers; the verified flag is the new signal.
                $official[] = array_merge($candidate, ['official_domain' => true]);
                $report['official_images']++;
            }
        }

        $ranked = $this->rankPlacePhotos((array) ($ctx['photo_references'] ?? []), (array) ($ctx['photo_meta'] ?? []), $dropped);
        $report['place_photos_too_small'] = $dropped;
        $report['place_photos_kept'] = count($ranked);

        foreach ($ranked as $ref) {
            $places[] = $this->placeCandidate((string) $ref, (string) ($ctx['place_id'] ?? ''), (array) (($ctx['photo_meta'] ?? [])[$ref] ?? []));
        }

        $selected = $this->finalize($this->allocate($official, $places));
        $selected = $this->dropUnreachable($selected, $report);

        // Last resort, and only when nothing photographic was found. Street View shows the
        // road-facing view — often a gate or a boundary wall rather than the towers — so it
        // is worth having when the alternative is a placeholder, and never worth preferring
        // over a real photograph of the place.
        if ($this->needsStreetViewFallback($selected, $ctx)) {
            $candidate = $this->streetViewCandidate($ctx, $report);
            if ($candidate !== null) {
                $selected[] = $candidate;
            }
        }

        return $selected;
    }

    /** @return array<int,array<string,mixed>> */
    public function fromUrl(string $url): array
    {
        if (! filter_var($url, FILTER_VALIDATE_URL)) {
            return [];
        }

        try {
            $response = Http::timeout(12)
                ->withHeaders(['User-Agent' => 'SocietyFlats Importer/2.0', 'Accept' => 'text/html,*/*'])
                ->get($url);
            if (! $response->successful()) {
                return [];
            }
            $html = (string) $response->body();
        } catch (\Throwable) {
            return [];
        }

        $host = parse_url($url, PHP_URL_HOST) ?: $url;
        $found = [];

        // og:image / twitter:image first — these are the curated hero shots.
        foreach ($this->metaImages($html) as $src) {
            $found[$this->absolutize($url, $src)] = true;
        }
        foreach ($this->bodyImages($html) as $src) {
            $found[$this->absolutize($url, $src)] = true;
        }

        $candidates = [];
        foreach (array_keys($found) as $imageUrl) {
            if (! $this->looksLikePhoto($imageUrl)) {
                continue;
            }
            $candidates[] = [
                'url' => $imageUrl,
                'source' => 'official_url',
                'credit' => $host,
                'license_note' => 'Developer/source marketing image. Confirm reuse rights and attribution before publishing.',
            ];
            if (count($candidates) >= self::PER_URL_LIMIT) {
                break;
            }
        }

        return $candidates;
    }

    /**
     * Order Google's photos by how likely they are to show the building, and drop the
     * ones that cannot be.
     *
     * Places returns whatever visitors uploaded near the pin, in no useful order — a
     * storefront, a press clipping, a car park. Resolution is the one signal available
     * without paying for vision: marketing and exterior shots are large and usually
     * landscape, while signage crops and screenshots are small. This does not make the
     * queue correct, it makes the best candidates surface first and removes the ones
     * that are certainly unusable.
     *
     * @param  array<int,string>  $references
     * @param  array<string,array<string,mixed>>  $meta
     * @return array<int,string>
     */
    private function rankPlacePhotos(array $references, array $meta, ?int &$dropped = null): array
    {
        $dropped = 0;
        $refs = array_values(array_filter($references, fn ($ref) => is_string($ref) && $ref !== ''));

        // No metadata (older callers, or Google omitted it) — behave exactly as before.
        if ($meta === []) {
            return array_slice($refs, 0, self::PER_URL_LIMIT);
        }

        $scored = [];
        foreach ($refs as $ref) {
            $width = (int) ($meta[$ref]['width'] ?? 0);
            $height = (int) ($meta[$ref]['height'] ?? 0);

            // Below this a photo is a thumbnail or a cropped sign, never a usable cover.
            if ($width > 0 && $width < self::MIN_USABLE_WIDTH) {
                $dropped++;

                continue;
            }

            $area = $width * $height;
            // A mild nudge for landscape: building exteriors are wider than they are tall.
            $scored[] = ['ref' => $ref, 'score' => $area * ($width >= $height ? 1.15 : 1.0)];
        }

        if ($scored === []) {
            return array_slice($refs, 0, self::PER_URL_LIMIT);
        }

        usort($scored, fn ($a, $b) => $b['score'] <=> $a['score']);

        return array_slice(array_column($scored, 'ref'), 0, self::PER_URL_LIMIT);
    }

    /** @param  array<string,mixed>  $meta */
    private function placeCandidate(string $reference, string $placeId, array $meta = []): array
    {
        $attribution = trim((string) ($meta['attribution'] ?? ''));

        return [
            'url' => null, // served via the publish-gated google-place-photo proxy after approval
            'photo_reference' => $reference,
            'place_id' => $placeId ?: null,
            'source' => 'google_places',
            'credit' => $attribution !== '' ? 'Google Places · '.$attribution : 'Google Places',
            'width' => (int) ($meta['width'] ?? 0) ?: null,
            'height' => (int) ($meta['height'] ?? 0) ?: null,
            'license_note' => 'Google Places photo. Review Google attribution/display terms before approving.',
        ];
    }

    /**
     * @param  array<int,array<string,mixed>>  $selected
     * @param  array<string,mixed>  $ctx
     */
    private function needsStreetViewFallback(array $selected, array $ctx): bool
    {
        if (! config('services.street_view_fallback_enabled', true)) {
            return false;
        }

        if (blank($ctx['latitude'] ?? null) || blank($ctx['longitude'] ?? null)) {
            return false;
        }

        // A project still being built has no building to photograph from the road; Street
        // View would show an empty plot, which is worse than a placeholder.
        if (($ctx['project_status'] ?? null) !== null
            && ! str_contains(strtolower((string) $ctx['project_status']), 'ready')) {
            return false;
        }

        // Only when no photograph of the place itself was found. Official-site marketing
        // images do not count as one: they are renders as often as photographs, and a
        // society with only those is exactly the gap this fills.
        return collect($selected)->every(fn ($c) => ($c['source'] ?? '') !== 'google_places');
    }

    /**
     * @param  array<string,mixed>  $ctx
     * @return array<string,mixed>|null
     */
    private function streetViewCandidate(array $ctx, ?array &$report = null): ?array
    {
        $latitude = (float) $ctx['latitude'];
        $longitude = (float) $ctx['longitude'];

        $status = $this->streetView->coverageStatus($latitude, $longitude);

        if ($status !== 'OK') {
            if ($report !== null) {
                $report['street_view'] = $this->streetView->statusIsConfigurationProblem($status)
                    ? 'Street View could not be called (Google said '.$status.') — the Street View Static API is probably not enabled for this key'
                    : 'no imagery at this location';
            }

            return null;
        }

        if ($report !== null) {
            $report['street_view'] = 'added as a fallback';
        }

        return [
            'url' => null,
            'photo_reference' => $this->streetView->reference($latitude, $longitude),
            'source' => 'google_street_view',
            'credit' => 'Google Street View',
            'license_note' => 'Google Street View imagery, displayed with the attribution Google embeds in the image.',
            'rights_confirmed' => false,
            'approved' => false,
            'is_cover' => false,
            'sort' => 99,
        ];
    }

    /**
     * Drop scraped URLs that do not actually serve an image.
     *
     * A page's markup is not a promise: og:image tags go stale, galleries hotlink-protect,
     * and paths 404 after a site rebuild. Storing those unchecked produced a review queue
     * of broken-image icons an admin could neither preview nor publish, with nothing to
     * say why. Only a definite refusal from the server removes a candidate — a timeout or
     * DNS blip proves nothing and leaves it in place.
     *
     * @param  array<int,array<string,mixed>>  $candidates
     * @return array<int,array<string,mixed>>
     */
    private function dropUnreachable(array $candidates, ?array &$report = null): array
    {
        $urls = [];
        foreach ($candidates as $i => $candidate) {
            if (filled($candidate['url'] ?? null)) {
                $urls[$i] = (string) $candidate['url'];
            }
        }

        if ($urls === []) {
            return $candidates;
        }

        try {
            $responses = Http::pool(fn ($pool) => array_map(
                fn ($url) => $pool->timeout(8)
                    ->withHeaders(['User-Agent' => 'SocietyFlats Importer/2.0', 'Accept' => 'image/*,*/*'])
                    ->head($url),
                $urls,
            ));
        } catch (\Throwable) {
            return $candidates;
        }

        $broken = 0;
        foreach (array_keys($urls) as $position => $index) {
            $response = $responses[$position] ?? null;

            // Only a served refusal is evidence. Anything else (exception, no response)
            // is inconclusive, and guessing would throw away good images.
            if (! $response instanceof \Illuminate\Http\Client\Response) {
                continue;
            }

            $status = $response->status();
            $type = strtolower(trim(explode(';', (string) $response->header('Content-Type'))[0]));

            // Definitive: the resource is gone, or the server answered 200 with something
            // that is plainly not an image (a soft-404 HTML page).
            // Inconclusive, so keep: 405/501 (many CDNs simply refuse HEAD), 403
            // (hotlink protection can still allow a real browser), 5xx, and any reply
            // with no Content-Type at all.
            $gone = in_array($status, [404, 410], true);
            $notAnImage = $status === 200 && $type !== '' && ! str_starts_with($type, 'image/');

            if ($gone || $notAnImage) {
                unset($candidates[$index]);
                $broken++;
            }
        }

        if ($report !== null) {
            $report['images_unreachable'] = $broken;
        }

        return array_values($candidates);
    }

    /**
     * Share the candidate budget between the two sources instead of letting whichever
     * ran first take all of it.
     *
     * A developer site with several pages at 8 images each fills MAX_CANDIDATES before a
     * single Google photo is appended, so societies came back with twelve marketing
     * renders and not one picture of the building as it stands. The two sources answer
     * different questions and the queue needs both.
     *
     * @param  array<int,array<string,mixed>>  $official
     * @param  array<int,array<string,mixed>>  $places
     * @return array<int,array<string,mixed>>
     */
    private function allocate(array $official, array $places): array
    {
        $placeSlots = min(count($places), self::PLACES_RESERVE);
        $officialSlots = self::MAX_CANDIDATES - $placeSlots;

        // Whatever one source cannot fill goes back to the other.
        if (count($official) < $officialSlots) {
            $placeSlots = min(count($places), self::MAX_CANDIDATES - count($official));
        }

        return array_merge(
            array_slice($official, 0, max($officialSlots, 0)),
            array_slice($places, 0, max($placeSlots, 0)),
        );
    }

    /** @return array<int,array<string,mixed>> */
    private function finalize(array $candidates): array
    {
        $seen = [];
        $out = [];

        foreach ($candidates as $candidate) {
            $key = $candidate['url'] ?? ('place:'.($candidate['photo_reference'] ?? ''));
            if ($key === '' || isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;

            $out[] = array_merge([
                'url' => null,
                'source' => 'official_url',
                'credit' => null,
                'license_note' => null,
                'rights_confirmed' => false,
                'approved' => false,
                'is_cover' => false,
                'sort' => count($out),
            ], $candidate);

            if (count($out) >= self::MAX_CANDIDATES) {
                break;
            }
        }

        return $out;
    }

    /** @return array<int,string> */
    private function metaImages(string $html): array
    {
        $images = [];
        if (preg_match_all('/<meta[^>]+(?:property|name)=["\'](?:og:image(?::secure_url)?|twitter:image)["\'][^>]+content=["\']([^"\']+)["\']/i', $html, $m)) {
            $images = array_merge($images, $m[1]);
        }
        if (preg_match_all('/<meta[^>]+content=["\']([^"\']+)["\'][^>]+(?:property|name)=["\'](?:og:image|twitter:image)["\']/i', $html, $m)) {
            $images = array_merge($images, $m[1]);
        }

        return $images;
    }

    /** @return array<int,string> */
    private function bodyImages(string $html): array
    {
        $images = [];
        if (preg_match_all('/<img[^>]+(?:data-src|data-lazy-src|src)=["\']([^"\']+)["\']/i', $html, $m)) {
            $images = array_merge($images, $m[1]);
        }

        return $images;
    }

    private function looksLikePhoto(string $url): bool
    {
        if (! preg_match('/^https?:\/\//i', $url) || str_starts_with($url, 'data:')) {
            return false;
        }
        if (! preg_match('/\.(jpe?g|png|webp|avif)(\?.*)?$/i', $url)) {
            return false;
        }
        // Skip logos, icons, sprites, placeholders and tracking pixels.
        if (preg_match('/(logo|icon|sprite|favicon|placeholder|blank|spacer|loader|pixel|1x1|avatar|whatsapp|footer|header)/i', $url)) {
            return false;
        }

        return true;
    }

    private function absolutize(string $base, string $src): string
    {
        $src = trim(html_entity_decode($src));
        if ($src === '' || preg_match('/^https?:\/\//i', $src)) {
            return $src;
        }
        if (str_starts_with($src, '//')) {
            $scheme = parse_url($base, PHP_URL_SCHEME) ?: 'https';

            return $scheme.':'.$src;
        }

        $scheme = parse_url($base, PHP_URL_SCHEME) ?: 'https';
        $host = parse_url($base, PHP_URL_HOST) ?: '';
        if ($host === '') {
            return $src;
        }
        $root = $scheme.'://'.$host;

        if (str_starts_with($src, '/')) {
            return $root.$src;
        }

        $path = parse_url($base, PHP_URL_PATH) ?: '/';
        $dir = rtrim(substr($path, 0, strrpos($path, '/') + 1), '/');

        return $root.$dir.'/'.$src;
    }
}
