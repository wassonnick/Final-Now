<?php

namespace App\Services\Seo;

use App\Models\Society;
use App\Models\SocietySeoContent;
use Illuminate\Support\Str;

/**
 * Do the work the autopilot was only filing tickets about.
 *
 * Nearly nine in ten open SEO tasks were four mechanical failures — a title a few
 * characters too long, a meta description outside its band, a missing alt string, fewer
 * than two internal links. None of them need a model to fix, and none of them were ever
 * being fixed: the generator wrote what it liked, the auditor rejected it, and the
 * resulting task sat open forever because nothing reconciled the two.
 *
 * Every repair here is deterministic and free. It also has to be conservative — these
 * titles are good, just long, so shortening drops the trailing clause before it ever
 * truncates mid-thought, and the society name stays at the front where it earns the click.
 */
class SeoMechanicalRepairService
{
    /** The audit's own thresholds. Kept here so the two can never drift apart again. */
    public const TITLE_MIN = 30;

    public const TITLE_MAX = 65;

    public const DESCRIPTION_MIN = 90;

    public const DESCRIPTION_MAX = 170;

    private const MIN_INTERNAL_LINKS = 2;

    public function run(int $limit = 400): array
    {
        $summary = ['titles' => 0, 'descriptions' => 0, 'alt_text' => 0, 'internal_links' => 0];

        SocietySeoContent::query()
            ->where('status', 'published')
            ->with('society')
            ->limit($limit)
            ->get()
            ->each(function (SocietySeoContent $content) use (&$summary) {
                $society = $content->society;
                if (! $society) {
                    return;
                }

                $changes = [];

                $title = $this->fitTitle((string) $content->seo_title, $society);
                if ($title !== (string) $content->seo_title) {
                    $changes['seo_title'] = $title;
                    $summary['titles']++;
                }

                $description = $this->fitDescription((string) $content->seo_description, $society);
                if ($description !== (string) $content->seo_description) {
                    $changes['seo_description'] = $description;
                    $summary['descriptions']++;
                }

                $links = $this->internalLinks($content, $society);
                if ($links !== null) {
                    $changes['internal_link_suggestions_json'] = $links;
                    $summary['internal_links']++;
                }

                if ($changes !== []) {
                    $content->update($changes);
                }

                if ($this->backfillAltText($society)) {
                    $summary['alt_text']++;
                }
            });

        return $summary;
    }

    /**
     * Bring a title inside the band without losing what makes it click.
     *
     * These read like "M3M Sierra 68, Sector 68 Gurgaon — Ready to Move, Rent ₹35,000…" —
     * the name and location earn the visit and the tail is a bonus Google truncates
     * anyway. So trailing clauses go first, and only a title still too long after that is
     * cut, always on a word boundary.
     */
    public function fitTitle(string $title, Society $society): string
    {
        $title = trim(preg_replace('/\s+/u', ' ', $title) ?? $title);

        if ($title === '') {
            $title = $this->composeTitle($society);
        }

        // Take the longest clean prefix that fits, not the first one. Dropping every clause
        // left "M3M Sierra 68, Sector 68 Gurgaon" at 32 characters and threw away "Ready to
        // Move" — a real search intent — with 33 characters of room still going spare.
        if (mb_strlen($title) > self::TITLE_MAX) {
            $best = null;
            foreach ($this->clausePrefixes($title) as $candidate) {
                $length = mb_strlen($candidate);
                if ($length >= self::TITLE_MIN && $length <= self::TITLE_MAX
                    && ($best === null || $length > mb_strlen($best))) {
                    $best = $candidate;
                }
            }

            if ($best !== null) {
                $title = $best;
            }
        }

        if (mb_strlen($title) > self::TITLE_MAX) {
            $title = $this->truncateOnWord($title, self::TITLE_MAX);
        }

        // A title that shortened its way under the floor is worse than a long one, so the
        // composed form takes over rather than shipping something stubby.
        if (mb_strlen($title) < self::TITLE_MIN) {
            $composed = $this->composeTitle($society);
            $title = mb_strlen($composed) > self::TITLE_MAX
                ? $this->truncateOnWord($composed, self::TITLE_MAX)
                : $composed;
        }

        return $title;
    }

    public function fitDescription(string $description, Society $society): string
    {
        $description = trim(preg_replace('/\s+/u', ' ', $description) ?? $description);

        if ($description === '') {
            $description = $this->composeDescription($society);
        }

        if (mb_strlen($description) > self::DESCRIPTION_MAX) {
            // Prefer ending on a real sentence; fall back to a word boundary.
            $sentence = $this->truncateOnSentence($description, self::DESCRIPTION_MAX);
            $description = mb_strlen($sentence) >= self::DESCRIPTION_MIN
                ? $sentence
                : $this->truncateOnWord($description, self::DESCRIPTION_MAX);
        }

        if (mb_strlen($description) < self::DESCRIPTION_MIN) {
            foreach ($this->descriptionFillers($society) as $filler) {
                if (mb_strlen($description) >= self::DESCRIPTION_MIN) {
                    break;
                }
                $candidate = rtrim($description, ' .').'. '.$filler;
                if (mb_strlen($candidate) <= self::DESCRIPTION_MAX) {
                    $description = $candidate;
                }
            }
        }

        return $description;
    }

    /** Null when the record already has enough links to pass. */
    public function internalLinks(SocietySeoContent $content, Society $society): ?array
    {
        $existing = array_values(array_filter((array) $content->internal_link_suggestions_json));
        if (count($existing) >= self::MIN_INTERNAL_LINKS) {
            return null;
        }

        $city = Str::slug((string) ($society->city ?: 'gurgaon'));
        $links = [];

        if (filled($society->sector)) {
            $links[] = ['label' => 'Flats in '.$society->sector, 'url' => '/gurgaon/'.Str::slug((string) $society->sector)];
        }
        if (filled($society->locality)) {
            $links[] = ['label' => 'Societies in '.$society->locality, 'url' => '/gurgaon/'.Str::slug((string) $society->locality)];
        }
        if (filled($society->builder) && ! preg_match('/to be verified|unknown/i', (string) $society->builder)) {
            $links[] = ['label' => 'More by '.$society->builder, 'url' => '/builder/'.Str::slug((string) $society->builder)];
        }

        $links[] = ['label' => 'Compare '.$society->name, 'url' => '/compare?societies='.$society->slug];
        $links[] = ['label' => 'Verified societies in '.($society->city ?: 'Gurgaon'), 'url' => '/ncr/'.$city];

        // Existing suggestions are kept — this fills a gap, it does not overwrite editorial.
        $merged = array_merge($existing, $links);
        $unique = [];
        foreach ($merged as $link) {
            $url = is_array($link) ? ($link['url'] ?? '') : (string) $link;
            if ($url === '' || isset($unique[$url])) {
                continue;
            }
            $unique[$url] = $link;
        }

        return array_slice(array_values($unique), 0, 6);
    }

    /**
     * Alt text is one string, and its absence was failing 469 pages.
     *
     * Written from the society's own facts rather than generated, so it describes the
     * photo honestly without claiming anything we cannot see.
     */
    public function backfillAltText(Society $society): bool
    {
        if (filled($society->image_alt_text)) {
            return false;
        }

        $hasImage = filled($society->cover_image) || filled($society->image_url)
            || filled($society->image_photo_reference) || (array) $society->approved_gallery_image_urls !== [];

        if (! $hasImage) {
            return false;
        }

        $where = collect([$society->sector, $society->locality, $society->city])
            ->filter()
            ->unique()
            ->take(2)
            ->implode(', ');

        $society->forceFill([
            'image_alt_text' => trim($society->name.($where !== '' ? ' — '.$where : '')),
        ])->saveQuietly();

        return true;
    }

    private function composeTitle(Society $society): string
    {
        $where = $society->sector ?: $society->locality ?: $society->city ?: 'Gurgaon';

        return trim($society->name.', '.$where.' | Verified Society');
    }

    private function composeDescription(Society $society): string
    {
        $where = collect([$society->sector, $society->locality])->filter()->unique()->implode(', ');

        return trim(sprintf(
            '%s in %s%s. Verified society details, amenities, connectivity and current rent and resale ranges on SocietyFlats.',
            $society->name,
            $where !== '' ? $where : ($society->city ?: 'Gurgaon'),
            $society->city && $where !== '' ? ', '.$society->city : '',
        ));
    }

    /** @return list<string> */
    private function descriptionFillers(Society $society): array
    {
        return array_values(array_filter([
            filled($society->project_status) ? $society->project_status.' in '.($society->city ?: 'Gurgaon').'.' : null,
            'Verified amenities, connectivity and market ranges on SocietyFlats.',
            'See scores, nearby schools and metro access before you visit.',
        ]));
    }

    /**
     * Every prefix of the title that ends on a clause boundary.
     *
     * Titles here are built from clauses joined by pipes, dashes and commas, so cutting at
     * one of those always leaves a sentence that still reads. Returning all of them lets
     * the caller pick the longest that fits rather than the first that does.
     *
     * @return list<string>
     */
    private function clausePrefixes(string $title): array
    {
        $prefixes = [];

        foreach ([' | ', ' — ', ' – ', ' - ', ', '] as $separator) {
            $offset = 0;
            while (($position = mb_strpos($title, $separator, $offset)) !== false) {
                $prefix = rtrim(mb_substr($title, 0, $position));
                if ($prefix !== '') {
                    $prefixes[] = $prefix;
                }
                $offset = $position + mb_strlen($separator);
            }
        }

        return array_values(array_unique($prefixes));
    }

    private function truncateOnWord(string $value, int $max): string
    {
        if (mb_strlen($value) <= $max) {
            return $value;
        }

        $cut = mb_substr($value, 0, $max);
        $space = mb_strrpos($cut, ' ');
        if ($space !== false && $space >= self::TITLE_MIN) {
            $cut = mb_substr($cut, 0, $space);
        }

        return rtrim($cut, " ,.–—-|");
    }

    private function truncateOnSentence(string $value, int $max): string
    {
        $cut = mb_substr($value, 0, $max);
        $stop = max(mb_strrpos($cut, '. ') ?: -1, mb_strrpos($cut, '! ') ?: -1, mb_strrpos($cut, '? ') ?: -1);

        return $stop > 0 ? rtrim(mb_substr($cut, 0, $stop + 1)) : $cut;
    }
}
