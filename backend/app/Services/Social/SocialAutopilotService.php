<?php

namespace App\Services\Social;

use App\Models\SocialAutomationSetting;
use App\Models\SocialPost;
use App\Models\SocialPublishLog;
use App\Models\Society;
use Illuminate\Support\Carbon;

/**
 * Hands-off social pipeline. Every day it plans a post from a weekday content calendar,
 * rotates the spotlight through published societies/sectors (least-recently-featured first),
 * generates grounded drafts, auto-approves the LOW-risk ones (with their AI image assets)
 * and schedules them across the day's publish window. A companion tick then publishes due,
 * approved, low-risk posts to connected accounts. Medium/high-risk drafts always stop and
 * wait for a human — the autopilot never loosens the risk classifier.
 */
class SocialAutopilotService
{
    /** Platforms the autopilot may schedule for API publishing (WhatsApp stays manual-export). */
    private const AUTO_PLATFORMS = ['instagram', 'facebook', 'linkedin', 'google_business'];

    public function __construct(
        private SocialDraftGeneratorService $generator,
        private SocialManualPublisherService $publisher,
    ) {}

    public function settings(): SocialAutomationSetting
    {
        return SocialAutomationSetting::current();
    }

    /** Daily cycle: plan → generate → auto-approve low risk → schedule. Returns a summary. */
    public function run(?Carbon $today = null): array
    {
        $settings = $this->settings();
        $summary = ['plan' => null, 'generated' => 0, 'auto_approved' => 0, 'scheduled' => 0, 'queued_for_review' => 0, 'skipped' => null];

        if (! $settings->enabled) {
            $summary['skipped'] = 'autopilot_disabled';

            return $this->finish($settings, $summary);
        }

        $today = $today ?: now($settings->timezone);
        $plan = $this->planFor($today);
        $summary['plan'] = ['pillar' => $plan['content_pillar'], 'society_id' => $plan['society_id'] ?? null, 'sector' => $plan['sector'] ?? null];

        $platforms = array_values(array_intersect((array) $settings->platforms ?: ['instagram', 'linkedin'], self::AUTO_PLATFORMS));
        if ($platforms === []) {
            $summary['skipped'] = 'no_auto_capable_platforms';

            return $this->finish($settings, $summary);
        }

        $input = [
            'platforms' => $platforms,
            'content_pillar' => $plan['content_pillar'],
            'objective' => $plan['objective'],
            'target_audience' => $plan['target_audience'],
            'number_of_variations' => max(1, min((int) $settings->posts_per_day, 6)),
            'generate_images' => (bool) $settings->generate_images,
            'image_style' => $plan['image_style'],
            'society_id' => $plan['society_id'] ?? null,
            'sector' => $plan['sector'] ?? null,
        ];

        $result = $this->generator->generate($input);
        $posts = collect($result['posts']);
        $summary['generated'] = $posts->count();

        $slots = $this->publishSlots($settings, $today, $posts->count());
        $slotIndex = 0;

        foreach ($posts as $post) {
            if ($post->risk_level === 'low' && $settings->auto_approve_low_risk) {
                $updates = ['status' => 'approved'];
                if ($settings->auto_publish_low_risk && isset($slots[$slotIndex])) {
                    $updates['scheduled_at'] = $slots[$slotIndex++];
                    $updates['publish_status'] = 'scheduled';
                    $summary['scheduled']++;
                }
                $post->update($updates);
                $this->approveAiAssets($post);
                $summary['auto_approved']++;
                $this->log($post, 'autopilot_auto_approve', 'approved', 'Low-risk draft auto-approved by autopilot.');
            } else {
                $summary['queued_for_review']++;
            }
        }

        return $this->finish($settings, $summary);
    }

    /** Publish every due, approved, LOW-risk scheduled post. Returns [published, failed, skipped]. */
    public function publishDue(): array
    {
        $settings = $this->settings();
        $summary = ['published' => 0, 'failed' => 0, 'skipped' => 0];

        if (! $settings->enabled || ! $settings->auto_publish_low_risk) {
            return $summary;
        }

        $due = SocialPost::query()
            ->where('status', 'approved')
            ->where('risk_level', 'low')
            ->where('publish_status', 'scheduled')
            ->whereNotNull('scheduled_at')
            ->where('scheduled_at', '<=', now())
            ->whereNull('posted_at')
            ->orderBy('scheduled_at')
            ->limit(10)
            ->get();

        foreach ($due as $post) {
            try {
                $this->publisher->publishAutomatically($post);
                $summary['published']++;
            } catch (\Throwable $e) {
                report($e);
                $summary['failed']++;
            }
        }

        return $summary;
    }

    /**
     * Weekday content calendar. Society spotlights rotate through published societies
     * least-recently-featured first; sector guides rotate sectors the same way. LOW-risk
     * output is explicitly steered away from the risk classifier's trigger words so safe
     * educational/brand posts can actually flow without a human.
     *
     * @return array<string,mixed>
     */
    public function planFor(Carbon $day): array
    {
        $lowRiskRule = 'For low-risk drafts avoid these words entirely: price, rent, sale, availability, builder, RERA, possession, investment, return, best, top, luxury, premium, exclusive, limited.';

        return match ((int) $day->dayOfWeekIso) {
            1, 6 => [
                'content_pillar' => 'education',
                'objective' => 'Teach one practical society-first home search lesson. '.$lowRiskRule,
                'target_audience' => 'Gurgaon families researching where to live next',
                'image_style' => 'minimal_vector',
            ],
            2, 5 => $this->societySpotlight($lowRiskRule),
            3 => $this->sectorGuide($lowRiskRule),
            default => [
                'content_pillar' => 'brand_trust',
                'objective' => 'Explain how SocietyFlats verifies societies and never shows fake inventory. '.$lowRiskRule,
                'target_audience' => 'Home seekers tired of misleading listings',
                'image_style' => 'clean_corporate',
            ],
        };
    }

    private function societySpotlight(string $lowRiskRule): array
    {
        $society = $this->leastRecentlyFeaturedSociety();

        return [
            'content_pillar' => 'society_spotlight',
            'objective' => 'Introduce this society factually from the supplied context: location, lived-in feel, verified highlights. '.$lowRiskRule,
            'target_audience' => 'Gurgaon home seekers comparing societies',
            'image_style' => 'premium_real_estate',
            'society_id' => $society?->id,
        ];
    }

    private function sectorGuide(string $lowRiskRule): array
    {
        $sector = $this->leastRecentlyFeaturedSector();

        return [
            'content_pillar' => 'sector_guide',
            'objective' => 'Give a factual, helpful overview of living in this sector using only supplied society context. '.$lowRiskRule,
            'target_audience' => 'Families shortlisting a Gurgaon sector',
            'image_style' => 'local_area_guide',
            'sector' => $sector,
        ];
    }

    private function leastRecentlyFeaturedSociety(): ?Society
    {
        $lastFeatured = SocialPost::query()
            ->where('source_type', 'society')
            ->whereNotNull('source_id')
            ->selectRaw('source_id, MAX(created_at) as last_used')
            ->groupBy('source_id')
            ->pluck('last_used', 'source_id');

        return Society::query()
            ->where('is_published', true)
            ->whereIn('status', ['Verified', 'Premium'])
            ->get(['id', 'name'])
            ->sortBy(fn (Society $society) => (string) ($lastFeatured[$society->id] ?? '1970-01-01'))
            ->first();
    }

    private function leastRecentlyFeaturedSector(): ?string
    {
        $sectors = Society::query()
            ->where('is_published', true)
            ->whereIn('status', ['Verified', 'Premium'])
            ->whereNotNull('sector')
            ->distinct()
            ->pluck('sector');

        if ($sectors->isEmpty()) {
            return null;
        }

        $lastUsed = SocialPost::query()
            ->where('source_type', 'sector')
            ->selectRaw("COALESCE(title, '') as t, MAX(created_at) as last_used")
            ->groupBy('t')
            ->pluck('last_used', 't');

        return $sectors
            ->sortBy(function (string $sector) use ($lastUsed) {
                $match = collect($lastUsed)->first(fn ($when, $title) => str_contains(mb_strtolower((string) $title), mb_strtolower($sector)));

                return (string) ($match ?? '1970-01-01');
            })
            ->first();
    }

    /** Spread today's posts across the configured publish window (skipping past hours). */
    private function publishSlots(SocialAutomationSetting $settings, Carbon $today, int $count): array
    {
        $hours = collect((array) $settings->publish_hours ?: [11, 16, 19])
            ->map(fn ($hour) => max(0, min(23, (int) $hour)))
            ->unique()->sort()->values();

        $slots = [];
        foreach ($hours as $hour) {
            $slot = $today->copy()->setTime($hour, 0);
            if ($slot->isFuture()) {
                $slots[] = $slot->clone()->utc();
            }
        }
        // If the window has passed (late run), fall back to tomorrow's first hour.
        while (count($slots) < $count) {
            $base = $slots !== [] ? end($slots) : $today->copy()->addDay()->setTime((int) $hours->first(), 0)->utc();
            $slots[] = $base->copy()->addHours(3);
        }

        return $slots;
    }

    /** AI-generated image assets on a low-risk post are safe to approve for publishing. */
    private function approveAiAssets(SocialPost $post): void
    {
        $post->assets()
            ->where('status', 'needs_approval')
            ->where('asset_type', 'image')
            ->whereNotNull('public_url')
            ->get()
            ->each(fn ($asset) => data_get($asset->metadata, 'ai_generated') ? $asset->update(['status' => 'approved']) : null);
    }

    private function finish(SocialAutomationSetting $settings, array $summary): array
    {
        $settings->update(['last_run_at' => now(), 'last_run_summary' => $summary]);

        return $summary;
    }

    private function log(SocialPost $post, string $action, string $status, string $message): void
    {
        SocialPublishLog::create([
            'social_post_id' => $post->id,
            'platform' => $post->platform,
            'action' => $action,
            'status' => $status,
            'actor' => 'autopilot',
            'message' => $message,
        ]);
    }
}
