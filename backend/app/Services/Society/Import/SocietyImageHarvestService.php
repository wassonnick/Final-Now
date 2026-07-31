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
    private const MAX_CANDIDATES = 12;
    private const PER_URL_LIMIT = 8;

    /** Anything narrower is a thumbnail or a cropped sign, never a usable cover. */
    private const MIN_USABLE_WIDTH = 640;

    /**
     * @param  array{name?:string, urls?:array<int,?string>, photo_references?:array<int,string>, photo_meta?:array<string,array{width?:int,height?:int,attribution?:?string}>, place_id?:string}  $ctx
     * @return array<int,array<string,mixed>>
     */
    public function harvest(array $ctx): array
    {
        $candidates = [];

        foreach (array_unique(array_filter((array) ($ctx['urls'] ?? []))) as $url) {
            foreach ($this->fromUrl((string) $url) as $candidate) {
                $candidates[] = $candidate;
            }
        }

        foreach ($this->rankPlacePhotos((array) ($ctx['photo_references'] ?? []), (array) ($ctx['photo_meta'] ?? [])) as $ref) {
            $candidates[] = $this->placeCandidate((string) $ref, (string) ($ctx['place_id'] ?? ''), (array) (($ctx['photo_meta'] ?? [])[$ref] ?? []));
        }

        return $this->finalize($candidates);
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
    private function rankPlacePhotos(array $references, array $meta): array
    {
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
