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
        private readonly \App\Services\GooglePlacesSocietyImageService $places,
        private readonly \App\Services\Ops\MarketSuggestionService $market,
    ) {}

    /**
     * @param  bool  $gated  When true (unattended jobs) the daily AI cap applies. Admin-initiated
     *                        completion passes false to bypass the cap — but the provider-limit
     *                        circuit-breaker (a real billing/quota failure) is always respected.
     * @return array{society_id:int,name:string,published:bool,actions:array<int,string>,missing:array<int,string>,blocked_by:array<int,string>}
     */
    public function complete(Society $society, bool $allowReEnrich = true, bool $gated = true): array
    {
        // Serialize completion per society. The auto-dispatched import job and a manual
        // 'Complete draft now' / sweep can otherwise run at the same instant, both see empty
        // data, and both pay for the same AI enrichment + SEO — a real double charge.
        $lock = \Illuminate\Support\Facades\Cache::lock('society-completion:'.$society->id, 300);
        if (! $lock->get()) {
            return ['society_id' => $society->id, 'name' => $society->name, 'published' => (bool) $society->is_published, 'actions' => ['skipped_already_running'], 'missing' => $this->missing($society), 'blocked_by' => []];
        }

        try {
            return $this->runCompletion($society, $allowReEnrich, $gated);
        } finally {
            $lock->release();
        }
    }

    /** @return array{society_id:int,name:string,published:bool,actions:array<int,string>,missing:array<int,string>,blocked_by:array<int,string>} */
    private function runCompletion(Society $society, bool $allowReEnrich, bool $gated): array
    {
        $actions = [];
        $blocked = [];

        if ($society->is_published) {
            return ['society_id' => $society->id, 'name' => $society->name, 'published' => true, 'actions' => ['already_published'], 'missing' => [], 'blocked_by' => []];
        }

        // AI is usable when the provider isn't billing-limited and either this is an admin
        // action (ungated) or the daily cap still has room.
        $aiUsable = ! $this->budget->providerLimited() && ($gated ? $this->budget->allow() : true);
        if (! $aiUsable) {
            $blocked[] = $this->budget->providerLimited() ? 'provider_limit' : 'ai_budget_cap';
        }

        // 1. Fill data gaps with one grounded re-enrich when core fields are missing.
        if ($allowReEnrich && $this->coreDataMissing($society) && $aiUsable) {
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

        // 1.5 Market: replace import-time price estimates (Excel columns, AI extraction —
        //     explicitly market_confirmed=false) with the grounded portal-consensus fetch
        //     BEFORE anything goes public. Skipped when the society already carries grounded
        //     market provenance (field_sources.market.refreshed_at) or admin-locked figures;
        //     the daily market:auto-refresh keeps it current afterwards.
        if ($aiUsable && ! data_get($society->field_sources, 'market.refreshed_at')) {
            try {
                // Web-search grounded — the expensive call class.
                $this->budget->record(\App\Services\Ops\AiBudgetGuard::UNIT_SEARCH);
                $this->market->refreshAndApply($society);
                $society->refresh();
                $actions[] = 'market_grounded';
            } catch (\App\Exceptions\AiProviderLimitException $e) {
                report($e);
                $this->budget->tripProviderLimit();
                $actions[] = 'market_provider_limited';
            } catch (\Throwable $e) {
                report($e);
                $actions[] = 'market_fetch_failed';
            }
        }

        // 2. Cover: approve the first Google Places candidate when no cover is approved yet
        //    (mirrors the import pipeline's rights-safe auto-approval; scraped images stay manual).
        if (! $society->image_approved_by_admin && $this->approveGoogleCover($society)) {
            $society->refresh();
            $actions[] = 'cover_approved';
        }

        // 3. SEO: generate + publish the society's SEO content when none is live.
        if (($society->seoContent?->status) !== 'published' && $aiUsable) {
            $actions[] = $this->publishSeoContent($society) ? 'seo_published' : 'seo_failed';
            $society->refresh();
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
            'blocked_by' => $missing === [] ? [] : array_values(array_unique($blocked)),
        ];
    }

    /**
     * Generate and publish the society's SEO content with the trusted verified-fact generator
     * (the same one the one-click completion uses). Records one AI call. Returns whether it
     * published. Reused by the SEO Autopilot to fill content for already-published societies
     * so their audit tasks can auto-resolve.
     */
    public function publishSeoContent(Society $society): bool
    {
        try {
            $this->budget->record();
            $existing = $society->seoContent;
            $result = $this->seoAi->generate($society, 'generate', $existing?->only(SocietySeoAiDraftService::OUTPUT_KEYS) ?: []);
            $seo = $society->seoContent()->firstOrNew();
            $seo->fill($result['content']);
            $seo->status = 'published';
            $seo->generated_by = 'ai';
            $seo->published_at = now();
            $seo->save();
            $this->seoScoring->update($seo);

            return true;
        } catch (\Throwable $e) {
            report($e);

            return false;
        }
    }

    /**
     * @return array<int,string> completeness gates that still fail (empty = ready to publish)
     *
     * A rights-safe cover image is NOT a blocking gate: the public site and mobile app render
     * a clean branded placeholder when a society has no approved photo, so a missing cover no
     * longer keeps an otherwise-complete, verified profile out of search. Step 2 still auto-
     * approves a real Google Places photo when one exists — this only stops the backlog from
     * stalling on societies that simply have no rights-safe image yet.
     */
    public function missing(Society $society): array
    {
        return array_values(array_filter([
            blank($society->description) ? 'description' : null,
            (float) $society->score <= 0 ? 'score' : null,
            blank($society->sector) && blank($society->locality) ? 'sector_or_locality' : null,
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

        // No harvested candidate — as a last automatic resort, look the society up on Google
        // Places by name and use its photo (same rights-safe basis: served on demand through
        // Google's API with attribution). Scraped/official images still require a human.
        try {
            $reference = $this->places->findImageReference($society);
            if (! empty($reference['photo_reference'])) {
                $society->update([
                    'place_id' => $reference['place_id'] ?: $society->place_id,
                    'image_photo_reference' => $reference['photo_reference'],
                    'image_reference_url' => $reference['safe_reference_url'] ?? null,
                    'image_status' => 'google_places_reference_found',
                    'image_approved_by_admin' => true,
                    'image_credit' => $reference['credit'] ?? 'Google Places',
                    'image_license_notes' => $reference['license_note']
                        ?? 'Google Places photo served on demand via API with attribution; auto-approved during completion.',
                ]);

                return true;
            }
        } catch (\Throwable $e) {
            report($e);
        }

        return false;
    }
}
