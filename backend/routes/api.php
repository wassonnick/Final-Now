<?php

use App\Http\Controllers\Api\AccountController;
use App\Http\Controllers\Api\Admin\AdminAccountController;
use App\Http\Controllers\Api\Admin\AdminBuilderPortalController;
use App\Http\Controllers\Api\Admin\AdminRentHistoryController;
use App\Http\Controllers\Api\Admin\AdminReviewController;
use App\Http\Controllers\Api\Admin\AdminSiteVisitController;
use App\Http\Controllers\Api\Admin\AdminStatsController;
use App\Http\Controllers\Api\Admin\ImageUploadController;
use App\Http\Controllers\Api\Admin\SocietyImportController;
use App\Http\Controllers\Api\AiChatController;
use App\Http\Controllers\Api\AIController;
use App\Http\Controllers\Api\BuilderPortalController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\PropertyController;
use App\Http\Controllers\Api\RentHistoryController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\SavedSearchController;
use App\Http\Controllers\Api\SiteVisitController;
use App\Http\Controllers\Api\SocietyController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json([
    'status' => 'ok',
    'service' => 'societyflats-api',
]));

Route::get('/societies', [SocietyController::class, 'index']);
Route::get('/societies/{idOrSlug}/google-place-photo', [SocietyController::class, 'googlePlacePhoto']);
Route::get('/societies/{slug}', [SocietyController::class, 'show']);
Route::get('/properties', [PropertyController::class, 'index']);
Route::get('/properties/{idOrSlug}', [PropertyController::class, 'show']);
Route::post('/leads', [LeadController::class, 'store']);
Route::post('/ai/advisor', [AIController::class, 'advisor']);
Route::post('/ai/chat', [AiChatController::class, 'store'])->middleware('throttle:10,1');
Route::get('/ai/chat/{token}', [AiChatController::class, 'show'])->middleware('throttle:30,1');
Route::post('/ai/recommendations', [AIController::class, 'recommendations']);
Route::get('/ai/rent-estimate', [AIController::class, 'rentEstimate']);
Route::get('/societies/{idOrSlug}/reviews', [ReviewController::class, 'bySociety']);
Route::get('/societies/{idOrSlug}/rent-history', [RentHistoryController::class, 'bySociety']);
Route::get('/societies/{idOrSlug}/announcements', [BuilderPortalController::class, 'announcements']);
Route::get('/rent-intelligence/trends', [RentHistoryController::class, 'trends']);
Route::post('/reviews', [ReviewController::class, 'store']);
Route::post('/reviews/{review}/helpful', [ReviewController::class, 'markHelpful']);
Route::get('/site-visits/{token}', [SiteVisitController::class, 'show']);
Route::post('/site-visits/{token}/confirm', [SiteVisitController::class, 'confirm']);
Route::prefix('admin')->middleware('admin.api')->group(function () {
    Route::get('/stats', AdminStatsController::class);
    Route::post('/uploads/images', [ImageUploadController::class, 'store']);
    Route::post('/societies/fetch-from-url', [SocietyController::class, 'fetchFromUrl']);
    Route::post('/societies/fetch-from-brochure', [SocietyController::class, 'fetchFromBrochure']);
    Route::post('/societies/create-from-fetched-data', [SocietyController::class, 'createFromFetchedData']);
    Route::post('/societies/{society}/enrich', [SocietyController::class, 'enrich']);
    Route::post('/societies/publish-fields/backfill', [SocietyController::class, 'backfillPublishFields']);
    Route::post('/societies/google-places-image-references/bulk', [SocietyController::class, 'bulkGooglePlacesImageReferences']);
    Route::post('/societies/{society}/google-places-image-reference', [SocietyController::class, 'googlePlacesImageReference']);
    Route::get('/import/jobs', [SocietyImportController::class, 'jobs']);
    Route::get('/import/jobs/{job}', [SocietyImportController::class, 'show']);
    Route::delete('/import/jobs/{job}', [SocietyImportController::class, 'destroy']);
    Route::get('/import/suggestions', [SocietyImportController::class, 'suggestions']);
    Route::get('/import/ai-status', [SocietyImportController::class, 'aiStatus']);
    Route::post('/import/by-name', [SocietyImportController::class, 'byName']);
    Route::post('/import/by-url', [SocietyImportController::class, 'byUrl']);
    Route::post('/import/bulk', [SocietyImportController::class, 'bulk']);
    Route::post('/import/bulk-names', [SocietyImportController::class, 'bulkNames']);
    Route::post('/import/spreadsheet', [SocietyImportController::class, 'spreadsheet']);
    Route::patch('/import/societies/{society}/image', [SocietyImportController::class, 'imageDecision']);
    Route::post('/societies/nearby-intelligence/bulk-auto-fill', [SocietyController::class, 'bulkNearbyIntelligenceAutoFill']);
    Route::post('/societies/{society}/nearby-intelligence/auto-fill', [SocietyController::class, 'nearbyIntelligenceAutoFill']);
    Route::apiResource('societies', SocietyController::class)->except(['create', 'edit']);
    Route::apiResource('properties', PropertyController::class)->except(['create', 'edit']);
    Route::apiResource('leads', LeadController::class)->only(['index', 'show', 'update', 'destroy']);
    Route::apiResource('accounts', AdminAccountController::class)->only(['index', 'show', 'update']);
    Route::apiResource('reviews', AdminReviewController::class)->only(['index', 'update', 'destroy']);
    Route::apiResource('rent-history', AdminRentHistoryController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::get('/builder-claims', [AdminBuilderPortalController::class, 'claims']);
    Route::patch('/builder-claims/{claim}', [AdminBuilderPortalController::class, 'updateClaim']);
    Route::get('/society-announcements', [AdminBuilderPortalController::class, 'announcements']);
    Route::patch('/society-announcements/{announcement}', [AdminBuilderPortalController::class, 'updateAnnouncement']);
    Route::get('/review-responses', [AdminBuilderPortalController::class, 'reviewResponses']);
    Route::patch('/review-responses/{response}', [AdminBuilderPortalController::class, 'updateReviewResponse']);
    Route::post('/site-visits/{siteVisit}/remind', [AdminSiteVisitController::class, 'remind']);
    Route::apiResource('site-visits', AdminSiteVisitController::class)->only(['index', 'store', 'update']);
});

Route::prefix('accounts')->group(function () {
    Route::post('/upsert', [AccountController::class, 'upsert']);
    Route::post('/request-otp', [AccountController::class, 'requestOtp']);
    Route::post('/verify-otp', [AccountController::class, 'verifyOtp']);
    Route::get('/me', [AccountController::class, 'me']);
    Route::get('/dashboard', [AccountController::class, 'dashboard']);
    Route::apiResource('saved-searches', SavedSearchController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::get('/saved-search-alerts', [SavedSearchController::class, 'alerts']);
    Route::get('/builder-claims', [BuilderPortalController::class, 'claims']);
    Route::post('/builder-claims', [BuilderPortalController::class, 'storeClaim']);
    Route::post('/builder-claims/{claim}/announcements', [BuilderPortalController::class, 'storeAnnouncement']);
    Route::post('/builder-claims/{claim}/reviews/{review}/response', [BuilderPortalController::class, 'storeReviewResponse']);
});
