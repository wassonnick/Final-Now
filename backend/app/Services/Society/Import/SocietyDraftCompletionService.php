<?php

namespace App\Services\Society\Import;

use App\Models\Society;
use App\Models\SocietySeoContent;
use App\Services\Ops\AiBudgetGuard;
use App\Services\SocietyImportService;
use App\Services\SocietySeoAiDraftService;
use App\Services\SocietySeoScoringService;

/**
 * Finish line for a one-click import: take an imported draft all the way to a live,
 * complete public page — data gaps re-enriched, a rights-safe cover approved, SEO content
 * generated and published — and publish the society only when every completeness gate
 * passes. Anything that cannot be completed honestly stays in review with an explicit
 * list of what is missing.
 */
class SocietyDraftCompletionService
{
    public function __construct(
        private readonly SocietyImportService $importer,
        private readonly SocietySeoAiDraftService $seoAi,
        private readonly SocietySeoScoringService $seoScoring,
        private readonly AiBudgetGuard $budget,
    ) {}

    /**
     * @return array{society_id:int,name:string,published:bool,actions:array<int,string>,missing:array<int,string>}
     */
    public function complete(Society $society, bool $allowReEnrich = true): array
    {
        $actions = [];

        if ($society->is_published) {
            return ['society_id' => $society->id, 'name' => $society->name, 'published' => true, 'actions' => ['already_published'], 'missing' => []];
        }

        // 1. Fill data gaps with one grounded re-enrich when core fields are missing.
        if ($allowReEnrich && $this->coreDataMissing($society) && $this->budget->allow() && ! $this->budget->providerLimited()) {
            try {
                $this->budget->record();
                $this->importer->reEnrichDraft($society, true);
                $society->refresh();
                $actions[] = 're_enriched';
            } catch (\Throwable $e) {
                report($e);
                $actions[] = 're_enrich_failed';
            }
        }

        // 2. Cover: approve the first Google Places candidate when no cover is approved yet
        //    (mirrors the import pipeline's rights-safe auto-approval; scraped images stay manual).
        if (! $society->image_approved_by_admin && $this->approveGoogleCover($society)) {
            $society->refresh();
            $actions[] = 'cover_approved';
        }

        // 3. SEO: generate + publish the society's SEO content when none is live.
        $seo = $society->seoContent;
        if (($seo?->status) !== 'published' && $this->budget->allow() && ! $this->budget->providerLimited()) {
            try {
                $this->budget->record();
                $result = $this->seoAi->generate($society, 'generate', $seo?->only(SocietySeoAiDraftService::OUTPUT_KEYS) ?: []);
                $seo = $society->seoContent()->firstOrNew();
                $seo->fill($result['content']);
                $seo->status = 'published';
                $seo->generated_by = 'ai';
                $seo->published_at = now();
                $seo->save();
                $this->seoScoring->update($seo);
                $actions[] = 'seo_published';
            } catch (\Throwable $e) {
                report($e);
                $actions[] = 'seo_failed';
            }
        }

        // 4. Publish only when every completeness gate passes.
        $missing = $this->missing($society->fresh());
        if ($missing === []) {
            $society->update([
                'status' => 'Verified',
                'verification_status' => 'Verified',
                'is_published' => true,
                'published_at' => $society->published_at ?: now(),
            ]);
            $actions[] = 'published';
        }

        return [
            'society_id' => $society->id,
            'name' => $society->name,
            'published' => $missing === [],
            'actions' => $actions,
            'missing' => $missing,
        ];
    }

    /** @return array<int,string> completeness gates that still fail (empty = ready to publish) */
    public function missing(Society $society): array
    {
        return array_values(array_filter([
            blank($society->description) ? 'description' : null,
            (float) $society->score <= 0 ? 'score' : null,
            blank($society->sector) && blank($society->locality) ? 'sector_or_locality' : null,
            ! $society->image_approved_by_admin ? 'approved_cover_image' : null,
            ($society->seoContent?->status) !== 'published' ? 'published_seo' : null,
        ]));
    }

    private function coreDataMissing(Society $society): bool
    {
        return blank($society->description)
            || (float) $society->score <= 0
            || (blank($society->sector) && blank($society->locality))
            || blank($society->amenities);
    }

    private function approveGoogleCover(Society $society): bool
    {
        $candidates = is_array($society->image_candidates) ? $society->image_candidates : [];
        foreach ($candidates as $index => $candidate) {
            if (($candidate['source'] ?? '') !== 'google_places' || empty($candidate['photo_reference'])) {
                continue;
            }

            $candidates[$index]['approved'] = true;
            $candidates[$index]['is_cover'] = true;
            $candidates[$index]['rights_confirmed'] = true;

            $society->update([
                'image_candidates' => $candidates,
                'image_photo_reference' => $candidate['photo_reference'],
                'image_status' => 'google_places_reference_found',
                'image_approved_by_admin' => true,
                'image_credit' => $candidate['credit'] ?? 'Google Places',
                'image_license_notes' => $candidate['license_note']
                    ?? 'Google Places photo served on demand via API with attribution; auto-approved during completion.',
            ]);

            return true;
        }

        return false;
    }
}
