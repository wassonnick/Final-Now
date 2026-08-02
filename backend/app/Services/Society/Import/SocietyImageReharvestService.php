<?php

namespace App\Services\Society\Import;

use App\Models\Society;
use Illuminate\Support\Facades\Log;

/**
 * Re-runs image discovery for a society that has already been imported.
 *
 * Every improvement to the harvester so far only helped societies imported *after* it
 * shipped. The catalogue still carries whatever the harvester of the day produced:
 * unranked thumbnails, images scraped from broker microsites, and — the reason this
 * exists — Google photo references that have since expired, which is why a society can
 * show "3 found, 10 candidates" and no picture at all.
 *
 * Re-harvest resolves the place afresh (references are short-lived), re-collects from
 * the official site through the same ownership check as a new import, screens what it
 * finds, and replaces the candidate list. It is safe to run repeatedly.
 */
class SocietyImageReharvestService
{
    public function __construct(
        private readonly PlaceResolverService $places,
        private readonly SocietyImageHarvestService $harvest,
        private readonly SocietyImageScreenService $screen,
    ) {
    }

    /**
     * @return array{
     *   society_id:int, name:string, status:string, note:string,
     *   before:int, after:int, rejected:int, screened:int, republished:bool
     * }
     */
    /**
     * Statuses that mean "this image is cleared and live". Re-harvesting refreshes the
     * CANDIDATE list; it must never quietly demote a cover an admin already cleared,
     * or the society loses its picture on the public site as a side effect.
     */
    /** Mirrors SocietyImageHarvestService::MIN_USABLE_WIDTH, for the message only. */
    private const MIN_WIDTH_LABEL = '640px';

    private const PUBLISHABLE_STATUSES = [
        'licensed_uploaded',
        'self_shot_uploaded',
        'developer_permission_received',
        'approved_for_live',
        'google_places_reference_found',
        'google_street_view_reference_found',
    ];

    public function reharvest(Society $society, bool $screenImages = true, bool $republishCover = true): array
    {
        $before = count((array) ($society->image_candidates ?? []));
        $result = fn (string $status, string $note, array $extra = []) => array_merge([
            'society_id' => $society->id,
            'name' => (string) $society->name,
            'status' => $status,
            'note' => $note,
            'before' => $before,
            'after' => $before,
            'rejected' => 0,
            'screened' => 0,
            'republished' => false,
            'diagnostics' => null,
        ], $extra);

        try {
            $place = $this->places->resolve(
                (string) $society->name,
                trim((string) ($society->sector ?: $society->locality)).' '.(string) ($society->city ?: 'Gurugram'),
                $society->place_id ? (string) $society->place_id : null,
            );
        } catch (\Throwable $e) {
            Log::warning('Image re-harvest place lookup failed', ['society' => $society->id, 'error' => $e->getMessage()]);

            return $result('failed', 'Google Places lookup failed: '.$e->getMessage());
        }

        $matched = (bool) ($place['matched'] ?? false);

        $report = null;
        $candidates = $this->harvest->harvest([
            'name' => (string) $society->name,
            'builder' => $society->builder,
            'urls' => [
                $society->official_project_url,
                $society->official_gallery_url,
                $society->official_developer_url,
                $society->official_source_url,
                $matched ? ($place['website'] ?? null) : null,
            ],
            'photo_references' => $matched ? (array) ($place['photo_references'] ?? []) : [],
            'photo_meta' => $matched ? (array) ($place['photo_meta'] ?? []) : [],
            'place_id' => $matched ? (string) ($place['place_id'] ?? '') : (string) ($society->place_id ?? ''),
            // Street View needs a point and a reason to believe there is a building at it.
            'latitude' => $matched ? ($place['latitude'] ?? $society->latitude) : $society->latitude,
            'longitude' => $matched ? ($place['longitude'] ?? $society->longitude) : $society->longitude,
            'project_status' => $society->project_status,
        ], $report);

        $report['place_matched'] = $matched;

        if ($candidates === []) {
            return $result('no_candidates', $this->explain($report), ['diagnostics' => $report]);
        }

        $screened = 0;
        $rejected = 0;

        if ($screenImages) {
            $pass = $this->screen->screenAll($candidates, (string) $society->name);
            $candidates = $pass['candidates'];
            $screened = $pass['screened'];
            $rejected = $pass['rejected'];
        }

        $usable = array_values(array_filter(
            $candidates,
            fn ($c) => ($c['screen']['verdict'] ?? SocietyImageScreenService::VERDICT_UNKNOWN) !== SocietyImageScreenService::VERDICT_REJECTED,
        ));

        if ($usable === []) {
            $society->image_candidates = $candidates;
            $society->image_status = $this->nextStatus($society, 'screened_all_rejected');
            $society->save();

            return $result('all_rejected', 'Every candidate was rejected by the image screen; nothing was published.', [
                'after' => count($candidates),
                'rejected' => $rejected,
                'screened' => $screened,
            ]);
        }

        $republished = false;

        if ($republishCover) {
            // Only a Google Places photo may auto-approve — an official-site image still
            // needs the rights confirmation an admin gives by hand.
            //
            // $usable already excludes anything the screen rejected. Requiring a positive
            // OK on top of that made an unavailable screen behave exactly like a screen
            // that condemned every photo: with the AI budget spent, every verdict is
            // "unknown" and no society would get a cover at all. Unknown must not reject,
            // here as everywhere else.
            $cover = collect($usable)->first(fn ($c) => in_array($c['source'] ?? '', ['google_places', 'google_street_view'], true));

            if ($cover !== null) {
                foreach ($candidates as $i => $candidate) {
                    $isCover = ($candidate['photo_reference'] ?? null) === ($cover['photo_reference'] ?? null);
                    $candidates[$i]['is_cover'] = $isCover;
                    $candidates[$i]['approved'] = $isCover ? true : (bool) ($candidate['approved'] ?? false);
                }

                $society->image_photo_reference = $cover['photo_reference'] ?? null;
                $society->image_credit = $cover['credit'] ?? 'Google Places';
                $isStreetView = ($cover['source'] ?? '') === 'google_street_view';
                $society->image_approved_by_admin = true;
                $republished = true;
            }
        }

        $society->image_candidates = $candidates;
        $society->image_status = $republished
            ? (($isStreetView ?? false) ? 'google_street_view_reference_found' : 'google_places_reference_found')
            : $this->nextStatus($society, 'candidates_pending_review');
        $society->save();

        return $result(
            'refreshed',
            $republished
                ? (($isStreetView ?? false)
                    ? 'Cover re-published from Google Street View — no photograph of this society exists on Places.'
                    : 'Cover re-published from a Google Places photo.')
                : ($republishCover
                    // "a cover still needs admin approval" described the outcome without
                    // naming a cause, which is useless on a restore run whose entire
                    // purpose is republishing covers. Only a Places photo may auto-publish,
                    // so say why there wasn't one.
                    ? $this->whyNoCover($report, count($candidates))
                    : 'Candidates refreshed; cover republishing was turned off for this run.'),
            [
                'after' => count($candidates),
                'rejected' => $rejected,
                'screened' => $screened,
                'republished' => $republished,
                'diagnostics' => $report,
            ],
        );
    }

    /**
     * Why a restore run refreshed a society but published no cover.
     *
     * Only a Google Places photo auto-publishes — an official-site image is the
     * developer's copyright and waits for a rights check — so "no cover" almost always
     * means "no usable Places photo", and the useful question is which step lost it.
     *
     * @param  array<string,mixed>  $report
     */
    private function whyNoCover(array $report, int $candidateCount): string
    {
        $tail = ' '.$candidateCount.' candidate(s) are on file for manual review.';

        if (! ($report['place_matched'] ?? false)) {
            return 'No cover published: Google Places did not match this society, and only a Places photo can auto-publish.'.$tail;
        }

        if ((int) ($report['place_photos_offered'] ?? 0) === 0) {
            return 'No cover published: Google matched this society but has no photos of it.'.$tail;
        }

        if ((int) ($report['place_photos_kept'] ?? 0) === 0) {
            return 'No cover published: all '.$report['place_photos_offered'].' Google photo(s) were below the 640px minimum width.'.$tail;
        }

        $streetView = (string) ($report['street_view'] ?? '');

        if (str_starts_with($streetView, 'Street View could not be called')) {
            return 'No cover published: Google has no photo of this society, and '.lcfirst($streetView).'.'.$tail;
        }

        if ($streetView === 'no imagery at this location') {
            return 'No cover published: Google has no photo of this society and no Street View coverage at its location.'.$tail;
        }

        return 'No cover published: every Google photo was screened out, so only official-site images remain — those need a rights check before publishing.'.$tail;
    }

    /**
     * Turn the harvest report into a sentence that names a cause an admin can act on.
     * "Nothing usable found" was true and useless: it read the same whether Google had
     * no match, the photos were too small, or the only URL on file was a broker site.
     *
     * @param  array<string,mixed>  $report
     */
    private function explain(array $report): string
    {
        $parts = [];

        if (! ($report['place_matched'] ?? false)) {
            $parts[] = 'Google Places did not match this society — check the name, sector and city, or set the place ID by hand.';
        } elseif (($report['place_photos_offered'] ?? 0) === 0) {
            $parts[] = 'Google matched the society but returned no photos at all (common for under-construction projects).';
        } elseif (($report['place_photos_kept'] ?? 0) === 0) {
            $parts[] = 'All '.$report['place_photos_offered'].' Google photo(s) were below the '.self::MIN_WIDTH_LABEL.' minimum width.';
        }

        $rejected = (array) ($report['urls_rejected'] ?? []);
        if ($rejected !== []) {
            $parts[] = count($rejected).' URL(s) were skipped because the domain is not the builder\'s own: '.implode(', ', array_slice($rejected, 0, 3)).'.';
        } elseif (($report['urls_seen'] ?? 0) === 0) {
            $parts[] = 'No official project or developer URL is on file for this society, so there was no site to read.';
        } elseif (($report['official_images'] ?? 0) === 0) {
            $parts[] = 'The official site was read but no usable image was found on the page.';
        }

        return $parts === [] ? 'Nothing usable found.' : implode(' ', $parts);
    }

    /** Keep a cleared status; otherwise record where the re-harvest left things. */
    private function nextStatus(Society $society, string $proposed): string
    {
        return in_array((string) $society->image_status, self::PUBLISHABLE_STATUSES, true)
            ? (string) $society->image_status
            : $proposed;
    }
}
