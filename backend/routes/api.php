<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\Admin\AdminAccountController;
use App\Http\Controllers\Api\Admin\AdminAiSpendController;
use App\Http\Controllers\Api\Admin\AdminBuilderPortalController;
use App\Http\Controllers\Api\Admin\AdminLocationController;
use App\Http\Controllers\Api\Admin\AdminRentHistoryController;
use App\Http\Controllers\Api\Admin\AdminReviewController;
use App\Http\Controllers\Api\Admin\AdminReferralController;
use App\Http\Controllers\Api\Admin\AdminNriCaseController;
use App\Http\Controllers\Api\Admin\AdminRwaPortalController;
use App\Http\Controllers\Api\Admin\AdminSiteVisitController;
use App\Http\Controllers\Api\Admin\AdminOpsController;
use App\Http\Controllers\Api\Admin\AdminSeoAutopilotController;
use App\Http\Controllers\Api\Admin\AdminSocialController;
use App\Http\Controllers\Api\Admin\AdminSocietyComparePageController;
use App\Http\Controllers\Api\Admin\AdminSocietyIntelligenceController;
use App\Http\Controllers\Api\Admin\AdminStatsController;
use App\Http\Controllers\Api\Admin\AdminSocietySeoContentController;
use App\Http\Controllers\Api\Admin\AdminSocietySeoReportController;
use App\Http\Controllers\Api\Admin\ImageUploadController;
use App\Http\Controllers\Api\Admin\SocietyImportController;
use App\Http\Controllers\Api\Admin\VerifiedSocietyImporterController;
use App\Http\Controllers\Api\AiChatController;
use App\Http\Controllers\Api\AIController;
use App\Http\Controllers\Api\BuilderPortalController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\PropertyController;
use App\Http\Controllers\Api\PublicSeoPageController;
use App\Http\Controllers\Api\RentHistoryController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\ReferralController;
use App\Http\Controllers\Api\NriCaseController;
use App\Http\Controllers\Api\RwaPortalController;
use App\Http\Controllers\Api\SavedSearchController;
use App\Http\Controllers\Api\SiteVisitController;
use App\Http\Controllers\Api\SocietyComparePageController;
use App\Http\Controllers\Api\SocietyController;
use App\Http\Controllers\Api\SocietyIntelligenceController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json([
    'status' => 'ok',
    'service' => 'societyflats-api',
]));

// External scheduler tick. A free external cron (e.g. cron-job.org) POSTs here every ~10 min
// with the OPS_SCHEDULER_TOKEN secret; this both wakes a sleeping free-tier container and runs
// the catch-up automation + queue, so SEO/import/social automation runs without a paid worker.
Route::post('/ops/scheduler-tick', function (\Illuminate\Http\Request $request) {
    $expected = (string) config('services.ops.scheduler_token');
    $provided = (string) ($request->header('X-Scheduler-Token') ?: $request->query('token'));
    abort_if($expected === '' || ! hash_equals($expected, $provided), 403, 'Invalid scheduler token.');

    \Illuminate\Support\Facades\Cache::put(\App\Services\Ops\SchedulerHeartbeat::CACHE_KEY, now()->toIso8601String(), now()->addDays(3));
    \Illuminate\Support\Facades\Artisan::call('ops:daily-catchup');
    \Illuminate\Support\Facades\Artisan::call('queue:work', ['--stop-when-empty' => true, '--max-time' => 45, '--tries' => 1]);

    return response()->json(['status' => 'ok', 'ran_at' => now()->toIso8601String()]);
})->middleware('throttle:10,1');

Route::get('/societies', [SocietyController::class, 'index']);
Route::get('/societies/lookup', [SocietyController::class, 'lookup']);
Route::get('/societies/{idOrSlug}/google-place-photo', [SocietyController::class, 'googlePlacePhoto']);
Route::get('/societies/{slug}/intelligence', [SocietyIntelligenceController::class, 'show']);
Route::get('/societies/{slug}/sources', [SocietyIntelligenceController::class, 'sources']);
Route::get('/societies/{slug}', [SocietyController::class, 'show']);
Route::post('/public/intelligence-corrections', [SocietyIntelligenceController::class, 'storeCorrection'])->middleware('throttle:5,1');
// Admin-authored campaign landings, rendered at /go/<slug> on the frontend.
Route::get('/campaigns/{slug}', function (string $slug) {
    $page = \App\Models\CampaignPage::where('slug', $slug)->where('status', \App\Models\CampaignPage::STATUS_PUBLISHED)->first();

    return $page
        ? response()->json(['status' => 'ok', 'data' => ['slug' => $page->slug] + $page->payload])
        : response()->json(['status' => 'error', 'message' => 'Campaign not found.'], 404);
})->middleware('throttle:60,1');
Route::get('/compare-pages', [SocietyComparePageController::class, 'index']);
Route::get('/compare-pages/{slug}', [SocietyComparePageController::class, 'show']);
Route::get('/compare/intelligence', [SocietyIntelligenceController::class, 'compare']);
Route::get('/properties', [PropertyController::class, 'index']);
Route::get('/properties/{idOrSlug}', [PropertyController::class, 'show']);
Route::get('/seo/pages/resolve', [PublicSeoPageController::class, 'resolve'])->middleware('throttle:60,1');

// Live sitemap built from the SEO page registry. The static-host sitemap.xml only updates on
// frontend deploys, so societies published between deploys were invisible to crawlers until
// the next build. robots.txt references this URL too (cross-host sitemaps are valid when
// declared in robots.txt), making new pages discoverable the day they publish.
Route::get('/seo/sitemap.xml', function (\App\Services\Seo\LiveSitemapService $sitemap) {
    return response($sitemap->cached(), 200)->header('Content-Type', 'application/xml');
})->middleware('throttle:30,1');
Route::post('/leads', [LeadController::class, 'store'])->middleware('throttle:10,1');
Route::post('/nri-cases', [NriCaseController::class, 'store'])->middleware('throttle:5,1');
Route::post('/ai/advisor', [AIController::class, 'advisor']);
Route::post('/ai/chat', [AiChatController::class, 'store'])->middleware('throttle:10,1');
Route::get('/ai/chat/{token}', [AiChatController::class, 'show'])->middleware('throttle:30,1');
Route::post('/ai/recommendations', [AIController::class, 'recommendations']);
Route::get('/ai/rent-estimate', [AIController::class, 'rentEstimate']);
Route::get('/societies/{idOrSlug}/reviews', [ReviewController::class, 'bySociety']);
Route::get('/societies/{idOrSlug}/rent-history', [RentHistoryController::class, 'bySociety']);
Route::get('/societies/{idOrSlug}/announcements', [BuilderPortalController::class, 'announcements']);
Route::get('/rwa/societies/{idOrSlug}', [RwaPortalController::class, 'show']);
Route::post('/rwa/societies/{idOrSlug}/threads', [RwaPortalController::class, 'storeThread'])->middleware('throttle:10,1');
Route::post('/rwa/threads/{thread}/replies', [RwaPortalController::class, 'storeReply'])->middleware('throttle:10,1');
Route::get('/rent-intelligence/trends', [RentHistoryController::class, 'trends']);
Route::post('/reviews', [ReviewController::class, 'store']);
Route::post('/reviews/{review}/helpful', [ReviewController::class, 'markHelpful']);
Route::get('/site-visits/{token}', [SiteVisitController::class, 'show']);
Route::post('/site-visits/{token}/confirm', [SiteVisitController::class, 'confirm']);
Route::get('/admin/social/oauth/callback', [AdminSocialController::class, 'oauthCallback'])->middleware('throttle:20,1');
Route::prefix('admin')->middleware('admin.api')->group(function () {
    Route::get('/stats', AdminStatsController::class);
    Route::get('/locations', [AdminLocationController::class, 'index']);
    Route::get('/locations/audit', [AdminLocationController::class, 'audit']);
    Route::get('/locations/cities', [AdminLocationController::class, 'cities']);
    Route::get('/locations/zones', [AdminLocationController::class, 'zones']);
    Route::post('/locations/zones', [AdminLocationController::class, 'storeZone']);
    Route::patch('/locations/zones/{zone}', [AdminLocationController::class, 'updateZone']);
    Route::get('/locations/localities', [AdminLocationController::class, 'localities']);
    Route::post('/locations/localities', [AdminLocationController::class, 'storeLocality']);
    Route::patch('/locations/localities/{locality}', [AdminLocationController::class, 'updateLocality']);
    Route::get('/ai-spend', AdminAiSpendController::class);
    Route::get('/ai-chats', [\App\Http\Controllers\Api\Admin\AdminAiChatController::class, 'index']);
    Route::get('/ai-chats/{conversation}', [\App\Http\Controllers\Api\Admin\AdminAiChatController::class, 'show']);
    Route::get('/ops/action-inbox', [AdminOpsController::class, 'actionInbox']);
    Route::get('/ops/automation-health', [AdminOpsController::class, 'automationHealth']);
    Route::post('/ops/clear-provider-limit', [AdminOpsController::class, 'clearProviderLimit']);
    Route::get('/ops/suggestions', [AdminOpsController::class, 'suggestions']);
    Route::post('/ops/suggestions/{suggestion}/apply', [AdminOpsController::class, 'applySuggestion']);
    Route::post('/ops/suggestions/{suggestion}/dismiss', [AdminOpsController::class, 'dismissSuggestion']);
    Route::get('/campaigns', [\App\Http\Controllers\Api\Admin\AdminCampaignPageController::class, 'index']);
    Route::post('/campaigns', [\App\Http\Controllers\Api\Admin\AdminCampaignPageController::class, 'store']);
    Route::patch('/campaigns/{campaignPage}', [\App\Http\Controllers\Api\Admin\AdminCampaignPageController::class, 'update']);
    Route::delete('/campaigns/{campaignPage}', [\App\Http\Controllers\Api\Admin\AdminCampaignPageController::class, 'destroy']);
    Route::get('/seo/compare-pages', [AdminSocietyComparePageController::class, 'index']);
    Route::post('/seo/compare-pages/generate', [AdminSocietyComparePageController::class, 'generate']);
    Route::post('/seo/compare-pages/bulk-generate', [AdminSocietyComparePageController::class, 'bulkGenerate']);
    Route::get('/seo/compare-pages/{comparePage}', [AdminSocietyComparePageController::class, 'show']);
    Route::patch('/seo/compare-pages/{comparePage}', [AdminSocietyComparePageController::class, 'update']);
    Route::post('/seo/compare-pages/{comparePage}/approve', [AdminSocietyComparePageController::class, 'approve']);
    Route::post('/seo/compare-pages/{comparePage}/publish', [AdminSocietyComparePageController::class, 'publish']);
    Route::post('/seo/compare-pages/{comparePage}/unpublish', [AdminSocietyComparePageController::class, 'unpublish']);
    Route::post('/seo/compare-pages/{comparePage}/regenerate', [AdminSocietyComparePageController::class, 'regenerate']);
    Route::post('/uploads/images', [ImageUploadController::class, 'store']);
    Route::get('/ai/social/context', [AdminSocialController::class, 'context']);
    Route::prefix('social')->group(function () {
        Route::get('/automation', [AdminSocialController::class, 'automationSettings']);
        Route::patch('/automation', [AdminSocialController::class, 'updateAutomationSettings']);
        Route::post('/automation/run', [AdminSocialController::class, 'runAutopilot']);
        Route::post('/generate', [AdminSocialController::class, 'generate']);
        Route::get('/posts', [AdminSocialController::class, 'posts']);
        Route::get('/posts/{post}', [AdminSocialController::class, 'showPost']);
        Route::patch('/posts/{post}', [AdminSocialController::class, 'updatePost']);
        Route::post('/posts/{post}/approve', [AdminSocialController::class, 'approvePost']);
        Route::post('/posts/{post}/reject', [AdminSocialController::class, 'rejectPost']);
        Route::post('/posts/{post}/generate-image', [AdminSocialController::class, 'generateImage']);
        Route::post('/posts/{post}/publish', [AdminSocialController::class, 'publishPost']);
        Route::get('/assets', [AdminSocialController::class, 'assets']);
        Route::patch('/assets/{asset}', [AdminSocialController::class, 'updateAsset']);
        Route::post('/assets/{asset}/approve', [AdminSocialController::class, 'approveAsset']);
        Route::post('/assets/{asset}/reject', [AdminSocialController::class, 'rejectAsset']);
        Route::get('/accounts', [AdminSocialController::class, 'accounts']);
        Route::post('/oauth/{platform}/start', [AdminSocialController::class, 'startOAuth']);
        Route::post('/oauth/callback', [AdminSocialController::class, 'oauthCallback']);
        Route::post('/oauth/meta/select-page', [AdminSocialController::class, 'selectMetaPage']);
        Route::get('/meta/pages/debug', [AdminSocialController::class, 'debugMetaPages']);
        Route::get('/meta/publish-review-url', [AdminSocialController::class, 'metaPublishReviewUrl']);
        Route::post('/meta/pages/select', [AdminSocialController::class, 'selectMetaGraphPage']);
        Route::get('/google-business/locations', [AdminSocialController::class, 'googleBusinessLocations']);
        Route::post('/google-business/locations/select', [AdminSocialController::class, 'selectGoogleBusinessLocation']);
        Route::get('/publish-logs', [AdminSocialController::class, 'publishLogs']);
    });
    Route::prefix('seo-autopilot')->group(function () {
        Route::get('/dashboard', [AdminSeoAutopilotController::class, 'dashboard']);
        Route::get('/pages', [AdminSeoAutopilotController::class, 'pages']);
        Route::post('/audit', [AdminSeoAutopilotController::class, 'runAudit']);
        Route::post('/automation/run', [AdminSeoAutopilotController::class, 'runAutomation']);
        Route::patch('/automation/settings', [AdminSeoAutopilotController::class, 'updateAutomationSettings']);
        Route::get('/tasks', [AdminSeoAutopilotController::class, 'tasks']);
        Route::patch('/tasks/{task}', [AdminSeoAutopilotController::class, 'updateTask']);
        Route::get('/keywords', [AdminSeoAutopilotController::class, 'keywordList']);
        Route::post('/keywords/seed', [AdminSeoAutopilotController::class, 'seedKeywords']);
        Route::post('/search-console/import', [AdminSeoAutopilotController::class, 'importSearchConsole']);
        Route::post('/search-console/fetch', [AdminSeoAutopilotController::class, 'fetchSearchConsole']);
        Route::get('/drafts', [AdminSeoAutopilotController::class, 'draftList']);
        Route::post('/pages/{page}/drafts', [AdminSeoAutopilotController::class, 'generateDraft']);
        Route::patch('/drafts/{draft}', [AdminSeoAutopilotController::class, 'updateDraft']);
        Route::post('/drafts/{draft}/approve', [AdminSeoAutopilotController::class, 'approveDraft']);
        Route::post('/drafts/{draft}/reject', [AdminSeoAutopilotController::class, 'rejectDraft']);
        Route::post('/drafts/{draft}/publish', [AdminSeoAutopilotController::class, 'publishDraft']);
        Route::get('/reports', [AdminSeoAutopilotController::class, 'reportList']);
        Route::post('/reports', [AdminSeoAutopilotController::class, 'generateReport']);
    });
    Route::post('/societies/fetch-from-url', [SocietyController::class, 'fetchFromUrl']);
    Route::get('/societies/lookup', [SocietyController::class, 'lookup']);
    Route::post('/societies/fetch-from-brochure', [SocietyController::class, 'fetchFromBrochure']);
    Route::post('/societies/create-from-fetched-data', [SocietyController::class, 'createFromFetchedData']);
    Route::post('/societies/{society}/enrich', [SocietyController::class, 'enrich']);
    Route::get('/societies/{society}/intelligence', [AdminSocietyIntelligenceController::class, 'show']);
    Route::put('/societies/{society}/intelligence', [AdminSocietyIntelligenceController::class, 'update']);
    Route::post('/societies/{society}/intelligence/recalculate', [AdminSocietyIntelligenceController::class, 'recalculate']);
    Route::post('/societies/{society}/intelligence/approve', [AdminSocietyIntelligenceController::class, 'approve']);
    Route::post('/societies/{society}/intelligence/publish', [AdminSocietyIntelligenceController::class, 'publish']);
    Route::post('/societies/{society}/intelligence/unpublish', [AdminSocietyIntelligenceController::class, 'unpublish']);
    Route::put('/societies/{society}/intelligence/sources', [AdminSocietyIntelligenceController::class, 'upsertSources']);
    Route::get('/intelligence-corrections', [AdminSocietyIntelligenceController::class, 'corrections']);
    Route::patch('/intelligence-corrections/{correction}', [AdminSocietyIntelligenceController::class, 'updateCorrection']);
    Route::post('/societies/publish-fields/backfill', [SocietyController::class, 'backfillPublishFields']);
    Route::post('/societies/google-places-image-references/bulk', [SocietyController::class, 'bulkGooglePlacesImageReferences']);
    Route::post('/societies/{society}/google-places-image-reference', [SocietyController::class, 'googlePlacesImageReference']);
    Route::get('/import/jobs', [SocietyImportController::class, 'jobs']);
    Route::get('/import/jobs/{job}', [SocietyImportController::class, 'show']);
    Route::delete('/import/jobs/{job}', [SocietyImportController::class, 'destroy']);
    Route::get('/import/ai-status', [SocietyImportController::class, 'aiStatus']);
    Route::get('/import/place-photo', [SocietyImportController::class, 'placePhoto']);
    Route::post('/import/single', [SocietyImportController::class, 'single']);
    Route::post('/import/bulk', [SocietyImportController::class, 'bulk']);
    Route::post('/import/spreadsheet', [SocietyImportController::class, 'spreadsheet']);
    Route::post('/import/structured', [SocietyImportController::class, 'structuredImport']);
    Route::post('/import/societies/bulk-re-enrich', [SocietyImportController::class, 'bulkReEnrich']);
    Route::patch('/import/societies/{society}/image', [SocietyImportController::class, 'imageDecision']);
    Route::post('/import/societies/{society}/image-candidates', [SocietyImportController::class, 'imageCandidateDecision']);
    Route::post('/import/societies/{society}/re-enrich', [SocietyImportController::class, 'reEnrich']);
    Route::post('/import/societies/{society}/market-refresh', [SocietyImportController::class, 'marketRefresh']);
    Route::post('/import/societies/{society}/market-override', [SocietyImportController::class, 'marketOverride']);
    Route::post('/import/societies/{society}/publish', [SocietyImportController::class, 'publish']);
    Route::prefix('verified-importer')->group(function () {
        Route::get('/jobs', [VerifiedSocietyImporterController::class, 'jobs']);
        Route::get('/jobs/{job}', [VerifiedSocietyImporterController::class, 'showJob']);
        Route::post('/single', [VerifiedSocietyImporterController::class, 'singleImport']);
        Route::post('/bulk', [VerifiedSocietyImporterController::class, 'bulkImport']);
        Route::post('/excel/preview', [VerifiedSocietyImporterController::class, 'previewExcel']);
        Route::post('/excel/import', [VerifiedSocietyImporterController::class, 'importExcel']);
        Route::get('/template', [VerifiedSocietyImporterController::class, 'downloadTemplate']);
        Route::get('/review', [VerifiedSocietyImporterController::class, 'reviewQueue']);
        Route::post('/fields/{field}/approve', [VerifiedSocietyImporterController::class, 'approveField']);
        Route::post('/fields/{field}/reject', [VerifiedSocietyImporterController::class, 'rejectField']);
        Route::post('/images/{image}/approve', [VerifiedSocietyImporterController::class, 'approveImage']);
        Route::post('/images/{image}/reject', [VerifiedSocietyImporterController::class, 'rejectImage']);
        Route::post('/images/{image}/set-cover', [VerifiedSocietyImporterController::class, 'setCoverImage']);
        Route::get('/images/{image}/preview', [VerifiedSocietyImporterController::class, 'previewImage']);
        Route::post('/jobs/{job}/retry-failed', [VerifiedSocietyImporterController::class, 'retryFailedRows']);
        Route::post('/societies/{society}/apply-high-confidence', [VerifiedSocietyImporterController::class, 'applyHighConfidence']);
        Route::post('/societies/{society}/complete', [VerifiedSocietyImporterController::class, 'completeDraft']);
        Route::post('/complete-all-drafts', [VerifiedSocietyImporterController::class, 'completeAllDrafts']);
        Route::post('/societies/{society}/enrich-google', [VerifiedSocietyImporterController::class, 'enrichExistingDraft']);
        Route::post('/societies/{society}/source-layers/{layer}', [VerifiedSocietyImporterController::class, 'importSourceLayer']);
        Route::post('/societies/{society}/nearby-google', [VerifiedSocietyImporterController::class, 'importGoogleNearby']);
        Route::post('/societies/{society}/generate-description', [VerifiedSocietyImporterController::class, 'generateDescription']);
        Route::post('/societies/{society}/generate-seo', [VerifiedSocietyImporterController::class, 'generateSeo']);
        Route::post('/societies/{society}/generate-scores', [VerifiedSocietyImporterController::class, 'generateScores']);
        Route::post('/societies/{society}/apply-market-data', [VerifiedSocietyImporterController::class, 'applyMarketData']);
    });
    Route::post('/societies/nearby-intelligence/bulk-auto-fill', [SocietyController::class, 'bulkNearbyIntelligenceAutoFill']);
    Route::post('/societies/{society}/nearby-intelligence/auto-fill', [SocietyController::class, 'nearbyIntelligenceAutoFill']);
    Route::get('/societies/seo-content/report', [AdminSocietySeoReportController::class, 'report']);
    Route::get('/societies/seo-content/revoice-pending', [AdminSocietySeoContentController::class, 'revoicePending']);
    Route::post('/societies/seo-content/revoice-generate', [AdminSocietySeoContentController::class, 'generateRevoiceBatch']);
    Route::post('/societies/seo-content/bulk-generate-drafts', [AdminSocietySeoReportController::class, 'bulkGenerate']);
    Route::post('/societies/seo-content/bulk-score', [AdminSocietySeoReportController::class, 'bulkScore']);
    Route::post('/societies/seo-content/bulk-regenerate-missing', [AdminSocietySeoReportController::class, 'bulkRegenerateMissing']);
    Route::get('/societies/{society}/seo-content', [AdminSocietySeoContentController::class, 'show']);
    Route::post('/societies/{society}/seo-content', [AdminSocietySeoContentController::class, 'store']);
    Route::match(['put', 'patch'], '/societies/{society}/seo-content', [AdminSocietySeoContentController::class, 'update']);
    Route::post('/societies/{society}/seo-content/score', [AdminSocietySeoContentController::class, 'score']);
    Route::post('/societies/{society}/seo-content/approve', [AdminSocietySeoContentController::class, 'approve']);
    Route::post('/societies/{society}/seo-content/publish', [AdminSocietySeoContentController::class, 'publish']);
    Route::post('/societies/{society}/seo-content/unpublish', [AdminSocietySeoContentController::class, 'unpublish']);
    Route::post('/societies/{society}/seo-content/preview', [AdminSocietySeoContentController::class, 'preview']);
    Route::post('/societies/{society}/seo-content/generate-ai-draft', [AdminSocietySeoContentController::class, 'generateAiDraft']);
    Route::post('/societies/{society}/seo-content/improve-ai-draft', [AdminSocietySeoContentController::class, 'improveAiDraft']);
    Route::post('/societies/{society}/seo-content/revoice/approve', [AdminSocietySeoContentController::class, 'approveRevoice']);
    Route::post('/societies/{society}/seo-content/revoice/reject', [AdminSocietySeoContentController::class, 'rejectRevoice']);
    Route::apiResource('societies', SocietyController::class)->except(['create', 'edit']);
    Route::apiResource('properties', PropertyController::class)->except(['create', 'edit']);
    Route::apiResource('leads', LeadController::class)->only(['index', 'show', 'update', 'destroy']);
    Route::apiResource('accounts', AdminAccountController::class)->only(['index', 'show', 'update']);
    Route::get('/owner-listings', [\App\Http\Controllers\Api\Admin\AdminOwnerListingController::class, 'index']);
    Route::patch('/owner-listings/{listing}', [\App\Http\Controllers\Api\Admin\AdminOwnerListingController::class, 'update']);
    Route::post('/owner-listings/{listing}/convert', [\App\Http\Controllers\Api\Admin\AdminOwnerListingController::class, 'convert']);
    Route::apiResource('reviews', AdminReviewController::class)->only(['index', 'update', 'destroy']);
    Route::apiResource('referrals', AdminReferralController::class)->only(['index', 'update']);
    Route::apiResource('nri-cases', AdminNriCaseController::class)->only(['index', 'update']);
    Route::apiResource('rent-history', AdminRentHistoryController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::get('/builder-claims', [AdminBuilderPortalController::class, 'claims']);
    Route::patch('/builder-claims/{claim}', [AdminBuilderPortalController::class, 'updateClaim']);
    Route::get('/society-announcements', [AdminBuilderPortalController::class, 'announcements']);
    Route::patch('/society-announcements/{announcement}', [AdminBuilderPortalController::class, 'updateAnnouncement']);
    Route::get('/review-responses', [AdminBuilderPortalController::class, 'reviewResponses']);
    Route::patch('/review-responses/{response}', [AdminBuilderPortalController::class, 'updateReviewResponse']);
    Route::get('/rwa-claims', [AdminRwaPortalController::class, 'claims']);
    Route::patch('/rwa-claims/{claim}', [AdminRwaPortalController::class, 'updateClaim']);
    Route::get('/rwa-threads', [AdminRwaPortalController::class, 'threads']);
    Route::patch('/rwa-threads/{thread}', [AdminRwaPortalController::class, 'updateThread']);
    Route::get('/rwa-replies', [AdminRwaPortalController::class, 'replies']);
    Route::patch('/rwa-replies/{reply}', [AdminRwaPortalController::class, 'updateReply']);
    Route::post('/site-visits/{siteVisit}/remind', [AdminSiteVisitController::class, 'remind']);
    Route::apiResource('site-visits', AdminSiteVisitController::class)->only(['index', 'store', 'update']);
});

// Public listing intake (flats + builder floors) — the core inventory catcher.
Route::post('/listings', [\App\Http\Controllers\Api\OwnerListingController::class, 'store'])->middleware('throttle:6,1');
Route::post('/listings/images', [\App\Http\Controllers\Api\OwnerListingController::class, 'uploadImage'])->middleware('throttle:20,1');

Route::prefix('accounts')->group(function () {
    Route::get('/listings', [\App\Http\Controllers\Api\OwnerListingController::class, 'mine']);
    Route::post('/upsert', [AccountController::class, 'upsert']);
    Route::post('/request-otp', [AccountController::class, 'requestOtp'])->middleware('throttle:5,1');
    Route::post('/verify-otp', [AccountController::class, 'verifyOtp'])->middleware('throttle:10,1');
    Route::get('/me', [AccountController::class, 'me']);
    Route::get('/dashboard', [AccountController::class, 'dashboard']);
    Route::get('/notification-preferences', [\App\Http\Controllers\Api\AccountNotificationController::class, 'preferences']);
    Route::patch('/notification-preferences', [\App\Http\Controllers\Api\AccountNotificationController::class, 'updatePreferences']);
    Route::get('/notifications', [\App\Http\Controllers\Api\AccountNotificationController::class, 'inbox']);
    Route::post('/notifications/mark-all-read', [\App\Http\Controllers\Api\AccountNotificationController::class, 'markAllRead']);
    Route::post('/notifications/{notification}/read', [\App\Http\Controllers\Api\AccountNotificationController::class, 'markRead']);
    Route::post('/device-tokens', [\App\Http\Controllers\Api\AccountNotificationController::class, 'upsertDevice'])->middleware('throttle:20,1');
    Route::delete('/device-tokens/{deviceId}', [\App\Http\Controllers\Api\AccountNotificationController::class, 'destroyDevice']);
    Route::get('/referrals', [ReferralController::class, 'index']);
    Route::post('/referrals', [ReferralController::class, 'store'])->middleware('throttle:10,1');
    Route::apiResource('saved-searches', SavedSearchController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::get('/saved-search-alerts', [SavedSearchController::class, 'alerts']);
    Route::get('/builder-claims', [BuilderPortalController::class, 'claims']);
    Route::post('/builder-claims', [BuilderPortalController::class, 'storeClaim']);
    Route::post('/builder-claims/{claim}/announcements', [BuilderPortalController::class, 'storeAnnouncement']);
    Route::post('/builder-claims/{claim}/reviews/{review}/response', [BuilderPortalController::class, 'storeReviewResponse']);
    Route::get('/rwa/dashboard', [RwaPortalController::class, 'dashboard']);
    Route::post('/rwa/claims', [RwaPortalController::class, 'storeClaim']);
    Route::post('/rwa/claims/{claim}/announcements', [RwaPortalController::class, 'storeAnnouncement']);
    Route::post('/rwa/threads/{thread}/resolve', [RwaPortalController::class, 'resolveThread']);
});
