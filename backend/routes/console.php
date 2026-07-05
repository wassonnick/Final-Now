<?php

use App\Jobs\AutoRefreshSocietyMarket;
use App\Jobs\RefreshSocietyMarketSuggestion;
use App\Models\AiConversation;
use App\Models\OpsDigest;
use App\Models\OpsSuggestion;
use App\Models\Property;
use App\Models\SiteVisit;
use App\Models\Society;
use App\Models\SocietyImportJob;
use App\Services\LeadNotificationService;
use App\Services\Ops\AdminOpsInboxService;
use App\Services\SocietyImportService;
use Illuminate\Support\Facades\Http;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Services\Seo\SeoAutopilotAuditService;
use App\Services\Seo\SeoKeywordIntelligenceService;
use App\Services\Seo\SeoPageRegistryService;
use App\Services\Seo\SeoReportService;
use App\Services\Seo\SeoSearchConsoleService;
use App\Services\Seo\SeoTechnicalAuditService;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('inventory:clear-dummy-properties {--force}', function () {
    $count = Property::count();

    if ($count === 0) {
        $this->info('No properties to delete.');

        return;
    }

    if (! $this->option('force') && ! $this->confirm("Delete {$count} property records?")) {
        $this->warn('Aborted.');

        return;
    }

    Property::query()->delete();
    $this->info("Deleted {$count} property records.");
})->purpose('Delete current property inventory before uploading verified real listings');

Artisan::command('seo:autopilot-audit', function () {
    $pages=app(SeoPageRegistryService::class)->sync();
    $result=app(SeoAutopilotAuditService::class)->run();
    $technical=app(SeoTechnicalAuditService::class)->run();
    $this->info("Registered {$pages} pages; audited {$result['checked']} pages at {$result['average_score']} average; {$technical['failed']} technical checks failed.");
})->purpose('Refresh the SEO page registry, persistent audits and tasks');

Artisan::command('seo:autopilot-keywords', function () {
    app(SeoPageRegistryService::class)->sync();
    $this->info(app(SeoKeywordIntelligenceService::class)->seed().' keyword mappings refreshed.');
})->purpose('Refresh first-party SEO keyword clusters and page mappings');

Artisan::command('seo:autopilot-search-console', function () {
    $service=app(SeoSearchConsoleService::class);
    if(!$service->configured()){$this->warn('Search Console is not configured; existing metrics were preserved.');return;}
    $this->info($service->fetch().' Search Console rows imported.');
})->purpose('Import optional Google Search Console metrics and opportunities');

Artisan::command('seo:autopilot-report {period=weekly}', function (string $period) {
    $report=app(SeoReportService::class)->generate($period);
    $this->info("Generated {$period} SEO report #{$report->id}.");
})->purpose('Generate a daily, weekly or monthly SEO Autopilot report');

Artisan::command('ops:daily-digest', function () {
    $payload = app(AdminOpsInboxService::class)->build(true);
    OpsDigest::updateOrCreate(['digest_date' => now()->startOfDay()], ['payload' => $payload]);
    $this->info(sprintf(
        'Ops digest stored: %d low-confidence, %d missing cover, %d missing SEO, %d lead SLA breaches, %d visit reminders due, sitemap %s.',
        $payload['societies']['low_confidence']['count'],
        $payload['societies']['missing_cover']['count'],
        $payload['societies']['missing_published_seo']['count'],
        $payload['leads']['breaches']['count'],
        $payload['site_visits']['reminders_due'],
        $payload['sitemap']['status'],
    ));
})->purpose('Store the daily admin Action Inbox digest (data quality, sitemap drift, lead SLA, visit reminders)');

Artisan::command('site-visits:send-reminders', function (LeadNotificationService $notifications) {
    $due = SiteVisit::query()
        ->where('status', 'confirmed')
        ->whereNotNull('selected_slot')
        ->whereNull('reminder_sent_at')
        ->whereBetween('selected_slot', [now(), now()->addHours(24)])
        ->get();

    if ($due->isEmpty()) {
        $this->info('No site-visit reminders due.');

        return;
    }

    // Without a configured webhook notifySiteVisit() is a silent no-op, so
    // stamping reminder_sent_at would falsely record reminders as sent.
    if (! config('services.lead_notifications.enabled') || trim((string) config('services.lead_notifications.webhook_url', '')) === '') {
        $this->warn("{$due->count()} reminder(s) due but the notification webhook is not configured; nothing was sent or stamped.");

        return;
    }

    foreach ($due as $visit) {
        $notifications->notifySiteVisit($visit, 'site_visit_reminder');
        $visit->update(['reminder_sent_at' => now()]);
    }
    $this->info("Sent {$due->count()} site-visit reminder(s).");
})->purpose('Send T-1-day reminders for confirmed site visits through the notification webhook');

Artisan::command('ops:queue-market-refresh {--limit=15}', function () {
    $limit = max(1, min((int) $this->option('limit'), 30));

    $pendingIds = OpsSuggestion::query()
        ->where('kind', 'market_refresh')->where('status', 'pending')
        ->pluck('society_id');

    // Oldest market data first: societies whose field_sources.market.refreshed_at
    // is missing sort ahead of recently refreshed ones.
    $societies = Society::query()
        ->where('is_published', true)
        ->whereNotIn('id', $pendingIds)
        ->get(['id', 'field_sources'])
        ->sortBy(fn ($s) => data_get($s->field_sources, 'market.refreshed_at') ?? '1970-01-01')
        ->take($limit);

    foreach ($societies as $society) {
        RefreshSocietyMarketSuggestion::dispatch($society->id);
    }
    $this->info("Queued market-refresh suggestions for {$societies->count()} societies (results land as pending suggestions, never auto-applied).");
})->purpose('Queue grounded market-data refresh suggestions for the stalest published societies');

Artisan::command('market:auto-refresh {--limit=12} {--max-age-days=30} {--force}', function () {
    // --force (or --max-age-days=0) re-refreshes every published society regardless of how
    // recently its market data was refreshed — used after a sourcing/model change to roll
    // the improvement across the whole catalogue rather than waiting for the age gate.
    $force = (bool) $this->option('force') || (int) $this->option('max-age-days') === 0;
    $limit = max(1, min((int) $this->option('limit'), $force ? 200 : 30));

    // If the provider already signalled a credit/usage limit, don't queue a sweep that
    // would just short-circuit — report it so the operator knows to top up and retry.
    if (app(\App\Services\Ops\AiBudgetGuard::class)->providerLimited()) {
        $this->warn('AI provider usage limit is active — skipping. It clears automatically; top up credits and retry later.');

        return;
    }

    $query = Society::query()->where('is_published', true)->get(['id', 'field_sources']);

    if ($force) {
        // Oldest-first so a limited forced batch still drains the stalest data first.
        $societies = $query
            ->sortBy(fn ($s) => data_get($s->field_sources, 'market.refreshed_at') ?? '1970-01-01')
            ->take($limit);
    } else {
        $maxAge = now()->subDays(max(1, (int) $this->option('max-age-days')))->toIso8601String();

        // Fully automatic: refresh published societies whose market data is missing or older
        // than the max age, oldest first, a batch per run. Applied directly to the live page.
        $societies = $query
            ->filter(fn ($s) => (data_get($s->field_sources, 'market.refreshed_at') ?? '1970-01-01') < $maxAge)
            ->sortBy(fn ($s) => data_get($s->field_sources, 'market.refreshed_at') ?? '1970-01-01')
            ->take($limit);
    }

    foreach ($societies as $society) {
        AutoRefreshSocietyMarket::dispatch($society->id);
    }
    $mode = $force ? 'forced (all published)' : 'age-gated';
    $this->info("Queued {$mode} market refresh for {$societies->count()} societies (rent/sale applied directly, no manual review).");
})->purpose('Keep published societies current with the market — auto-fetch and apply rent/sale ranges');

Artisan::command('ops:validate-photo-references {--limit=60}', function () {
    $base = rtrim((string) config('services.ops.public_api_url'), '/');
    $societies = Society::query()
        ->where('is_published', true)
        ->where('image_approved_by_admin', true)
        ->where('image_status', 'google_places_reference_found')
        ->whereNotNull('place_id')
        ->limit(max(1, min((int) $this->option('limit'), 200)))
        ->get(['id', 'name', 'slug']);

    $stale = 0;
    foreach ($societies as $society) {
        try {
            $response = Http::timeout(15)->get("{$base}/societies/{$society->slug}/google-place-photo", ['w' => 64]);
            $healthy = $response->successful();
        } catch (\Throwable) {
            $healthy = false;
        }

        if ($healthy) {
            // A previously flagged cover that now loads again resolves itself.
            OpsSuggestion::where('society_id', $society->id)->where('kind', 'cover_photo')->where('status', 'pending')
                ->update(['status' => 'dismissed', 'resolved_at' => now()]);

            continue;
        }

        $stale++;
        OpsSuggestion::updateOrCreate(
            ['society_id' => $society->id, 'kind' => 'cover_photo', 'status' => 'pending'],
            ['payload' => ['reason' => 'Approved Google Places cover no longer loads — re-approve a fresh photo.', 'checked_at' => now()->toIso8601String()], 'created_by' => 'system'],
        );
    }
    $this->info("Checked {$societies->count()} approved covers; {$stale} stale reference(s) flagged.");
})->purpose('Detect approved Google Places cover photos whose references have gone stale');

Artisan::command('imports:tick', function () {
    // Advance any in-flight auto-import jobs from the background scheduler so a
    // one-click bulk import completes on its own — the admin no longer has to keep
    // the import page open and polling for every society to finish.
    $jobs = SocietyImportJob::query()
        ->whereIn('status', ['queued', 'running'])
        ->orderBy('id')
        ->limit(5)
        ->get();

    if ($jobs->isEmpty()) {
        return;
    }

    $service = app(SocietyImportService::class);
    foreach ($jobs as $job) {
        $service->processJobTick($job);
    }
    $this->info("Advanced {$jobs->count()} in-flight import job(s).");
})->purpose('Drive queued/running auto-import jobs to completion in the background');

Schedule::command('imports:tick')->everyMinute()->withoutOverlapping();
Schedule::command('saved-searches:match')->dailyAt('08:00')->withoutOverlapping();
Schedule::command('ops:daily-digest')->dailyAt('07:30')->withoutOverlapping();
Schedule::command('site-visits:send-reminders')->dailyAt('09:00')->withoutOverlapping();
// Fully-automatic daily market refresh keeps every published society's rent/sale ranges
// current with no manual intervention. A daily batch of the stalest societies cycles the
// whole catalogue through within a few days, then rotates as data ages past 30 days.
Schedule::command('market:auto-refresh')->dailyAt('05:30')->withoutOverlapping();
Schedule::command('ops:validate-photo-references')->weeklyOn(2, '05:00')->withoutOverlapping();
Schedule::command('queue:work --stop-when-empty --max-time=50 --tries=1')->everyMinute()->withoutOverlapping()->runInBackground();
Schedule::call(fn () => AiConversation::query()->where('expires_at', '<', now())->delete())->dailyAt('03:15')->name('prune-expired-ai-conversations')->withoutOverlapping();
Schedule::command('seo:autopilot-audit')->dailyAt('02:00')->withoutOverlapping();
Schedule::command('seo:autopilot-keywords')->weeklyOn(1,'02:45')->withoutOverlapping();
Schedule::command('seo:autopilot-search-console')->weeklyOn(1,'03:15')->withoutOverlapping();
Schedule::command('seo:autopilot-report daily')->dailyAt('04:00')->withoutOverlapping();
Schedule::command('seo:autopilot-report weekly')->weeklyOn(1,'04:15')->withoutOverlapping();
Schedule::command('seo:autopilot-report monthly')->monthlyOn(1,'04:30')->withoutOverlapping();
