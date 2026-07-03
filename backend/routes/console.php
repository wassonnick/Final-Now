<?php

use App\Models\AiConversation;
use App\Models\OpsDigest;
use App\Models\Property;
use App\Models\SiteVisit;
use App\Services\LeadNotificationService;
use App\Services\Ops\AdminOpsInboxService;
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

Schedule::command('saved-searches:match')->dailyAt('08:00')->withoutOverlapping();
Schedule::command('ops:daily-digest')->dailyAt('07:30')->withoutOverlapping();
Schedule::command('site-visits:send-reminders')->dailyAt('09:00')->withoutOverlapping();
Schedule::call(fn () => AiConversation::query()->where('expires_at', '<', now())->delete())->dailyAt('03:15')->name('prune-expired-ai-conversations')->withoutOverlapping();
Schedule::command('seo:autopilot-audit')->dailyAt('02:00')->withoutOverlapping();
Schedule::command('seo:autopilot-keywords')->weeklyOn(1,'02:45')->withoutOverlapping();
Schedule::command('seo:autopilot-search-console')->weeklyOn(1,'03:15')->withoutOverlapping();
Schedule::command('seo:autopilot-report daily')->dailyAt('04:00')->withoutOverlapping();
Schedule::command('seo:autopilot-report weekly')->weeklyOn(1,'04:15')->withoutOverlapping();
Schedule::command('seo:autopilot-report monthly')->monthlyOn(1,'04:30')->withoutOverlapping();
