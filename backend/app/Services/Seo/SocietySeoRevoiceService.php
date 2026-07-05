<?php

namespace App\Services\Seo;

use App\Exceptions\AiProviderLimitException;
use App\Models\Society;
use App\Models\SocietySeoContent;
use App\Services\Ops\AiBudgetGuard;
use App\Services\SocietySeoAiDraftService;
use App\Services\SocietySeoScoringService;

/**
 * Review-first re-voicing of already-published society SEO content.
 *
 * The regenerated draft is parked in `revoice_draft` — the live published columns and status
 * are left untouched, so the public page keeps serving the current copy until an admin
 * approves. Approving merges the draft into the live columns and re-publishes; rejecting
 * simply discards it.
 */
class SocietySeoRevoiceService
{
    public function __construct(
        private readonly SocietySeoAiDraftService $ai,
        private readonly SocietySeoScoringService $scoring,
        private readonly AiBudgetGuard $budget,
    ) {
    }

    /**
     * Re-voice a batch of published societies into pending drafts. Skips societies that already
     * have a pending draft (unless $force), respects the daily AI budget cap, and trips the
     * provider circuit-breaker so a run stops cleanly at the credit line. Nothing goes live —
     * every result is a pending draft awaiting review.
     *
     * @return array{generated:int,failed:int,candidates:int,stopped:?string}
     */
    public function generateBatch(int $limit, bool $force = false): array
    {
        $limit = max(1, min($limit, 100));
        $summary = ['generated' => 0, 'failed' => 0, 'candidates' => 0, 'stopped' => null];

        if ($this->budget->providerLimited()) {
            $summary['stopped'] = 'provider_limit';

            return $summary;
        }

        $societies = Society::query()
            ->where('is_published', true)
            ->whereHas('seoContent', fn ($q) => $q->where('status', 'published'))
            ->with('seoContent')
            ->orderBy('id')
            ->get()
            ->filter(fn ($s) => $force || ! $s->seoContent?->hasPendingRevoice())
            ->take($limit);

        $summary['candidates'] = $societies->count();

        foreach ($societies as $society) {
            if (! $this->budget->allow() || $this->budget->providerLimited()) {
                $summary['stopped'] = 'budget_cap';
                break;
            }
            $this->budget->record();
            try {
                $this->generateForSociety($society);
                $summary['generated']++;
            } catch (AiProviderLimitException $e) {
                $this->budget->tripProviderLimit();
                $summary['stopped'] = 'provider_limit';
                break;
            } catch (\Throwable $e) {
                report($e);
                $summary['failed']++;
            }
        }

        return $summary;
    }

    /**
     * Regenerate a published society's SEO copy in the current brand voice and park it as a
     * pending revoice draft. Returns the draft, or null when the society has no published SEO
     * content to re-voice. Throws AiProviderLimitException on a provider credit/usage limit so
     * a bulk run can stop cleanly.
     *
     * @return array<string,mixed>|null
     */
    public function generateForSociety(Society $society): ?array
    {
        $content = $society->seoContent;
        if (! $content || $content->status !== 'published') {
            return null; // only re-voice content that is actually live
        }

        $existing = $content->only(SocietySeoAiDraftService::OUTPUT_KEYS);

        try {
            $result = $this->ai->generate($society, 'rewrite in the warmer SocietyFlats brand voice, same facts', $existing);
        } catch (\Anthropic\Core\Exceptions\APIStatusException $e) {
            if (in_array((int) ($e->status ?? 0), [402, 429], true)) {
                throw new AiProviderLimitException('SEO re-voice hit provider limit: '.$e->getMessage(), 0, $e);
            }
            throw $e;
        }

        $draft = $result['content'];
        $content->update([
            'revoice_draft' => $draft,
            'revoice_generated_at' => now(),
        ]);

        return $draft;
    }

    /**
     * Apply a pending revoice draft: merge it into the live columns, keep the content published
     * (re-stamping published_at), and clear the pending draft. Re-scores the updated content.
     */
    public function approve(SocietySeoContent $content, ?string $reviewer = null): SocietySeoContent
    {
        if (! $content->hasPendingRevoice()) {
            throw new \InvalidArgumentException('No pending re-voice draft to approve.');
        }

        $draft = (array) $content->revoice_draft;
        $updates = collect($draft)
            ->only(SocietySeoAiDraftService::OUTPUT_KEYS)
            ->all();

        $updates['status'] = 'published';
        $updates['published_at'] = now();
        $updates['generated_by'] = 'ai_plus_admin';
        if ($reviewer !== null) {
            $updates['reviewed_by'] = $reviewer;
        }
        $updates['revoice_draft'] = null;
        $updates['revoice_generated_at'] = null;

        $content->update($updates);
        $this->scoring->update($content);

        return $content->fresh();
    }

    /** Discard a pending revoice draft, leaving the live copy exactly as-is. */
    public function reject(SocietySeoContent $content): SocietySeoContent
    {
        $content->update(['revoice_draft' => null, 'revoice_generated_at' => null]);

        return $content->fresh();
    }
}
