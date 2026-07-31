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
        ]);

        if ($candidates === []) {
            return $result(
                'no_candidates',
                $matched
                    ? 'Nothing usable found. Google returned no photo of a usable size, and no verified official URL is on file.'
                    : 'Google Places did not match this society, and no verified official URL is on file.',
            );
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
            $society->image_status = 'screened_all_rejected';
            $society->save();

            return $result('all_rejected', 'Every candidate was rejected by the image screen; nothing was published.', [
                'after' => count($candidates),
                'rejected' => $rejected,
                'screened' => $screened,
            ]);
        }

        $republished = false;

        if ($republishCover) {
            // Only a candidate that passed the screen can become the cover, and only a
            // Google Places photo may auto-approve — an official-site image still needs
            // the rights confirmation an admin gives by hand.
            $cover = collect($usable)->first(fn ($c) => ($c['source'] ?? '') === 'google_places'
                && ($c['screen']['verdict'] ?? '') === SocietyImageScreenService::VERDICT_OK);

            if ($cover !== null) {
                foreach ($candidates as $i => $candidate) {
                    $isCover = ($candidate['photo_reference'] ?? null) === ($cover['photo_reference'] ?? null);
                    $candidates[$i]['is_cover'] = $isCover;
                    $candidates[$i]['approved'] = $isCover ? true : (bool) ($candidate['approved'] ?? false);
                }

                $society->image_photo_reference = $cover['photo_reference'] ?? null;
                $society->image_credit = $cover['credit'] ?? 'Google Places';
                $society->image_approved_by_admin = true;
                $republished = true;
            }
        }

        $society->image_candidates = $candidates;
        $society->image_status = $republished ? 'google_places_reference_found' : 'candidates_pending_review';
        $society->save();

        return $result(
            'refreshed',
            $republished
                ? 'Cover re-published from a screened Google Places photo.'
                : 'Candidates refreshed; a cover still needs admin approval.',
            [
                'after' => count($candidates),
                'rejected' => $rejected,
                'screened' => $screened,
                'republished' => $republished,
            ],
        );
    }
}
