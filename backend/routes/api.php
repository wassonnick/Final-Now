<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\SocietyController;
use App\Http\Controllers\Api\PropertyController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\AIController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Admin\AdminSocietyController;
use App\Http\Controllers\Api\Admin\AdminPropertyController;
use App\Http\Controllers\Api\Admin\AdminLeadController;
use App\Http\Controllers\Api\Admin\AdminReviewController;
use App\Http\Controllers\Api\Admin\AdminStatsController;

Route::prefix('v1')->group(function () {
    // Public society routes
    Route::get('/societies', [SocietyController::class, 'index']);
    Route::get('/societies/featured', [SocietyController::class, 'featured']);
    Route::get('/societies/{slug}', [SocietyController::class, 'show']);
    Route::get('/societies/{id}/intelligence', [SocietyController::class, 'intelligence']);
    Route::get('/societies/{id}/properties', [PropertyController::class, 'bySociety']);
    Route::get('/societies/{id}/reviews', [ReviewController::class, 'bySociety']);

    // Public property/search routes
    Route::get('/properties', [PropertyController::class, 'index']);
    Route::get('/properties/{slug}', [PropertyController::class, 'show']);
    Route::get('/properties/{id}/similar', [PropertyController::class, 'similar']);
    Route::get('/search', [SearchController::class, 'search']);
    Route::get('/search/autocomplete', [SearchController::class, 'autocomplete']);
    Route::get('/localities/{id}/societies', [SocietyController::class, 'byLocality']);

    // Public lead capture route. This is needed for property/society enquiry forms.
    Route::post('/leads', [LeadController::class, 'store']);

    // AI Routes
    Route::post('/ai/recommendations', [AIController::class, 'recommendations']);
    Route::get('/ai/rent-estimate', [AIController::class, 'rentEstimate']);

    // Auth Routes
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/otp/send', [AuthController::class, 'sendOtp']);
    Route::post('/auth/otp/verify', [AuthController::class, 'verifyOtp']);

    // Admin API foundation.
    // NOTE: This is intentionally left without middleware for first backend connectivity testing.
    // Before public launch, wrap this group in auth:sanctum and an admin/role middleware.
    Route::prefix('admin')->group(function () {
        Route::get('/stats', AdminStatsController::class);

        Route::apiResource('societies', AdminSocietyController::class);
        Route::apiResource('properties', AdminPropertyController::class);

        Route::get('/leads', [AdminLeadController::class, 'index']);
        Route::get('/leads/{id}', [AdminLeadController::class, 'show']);
        Route::put('/leads/{id}', [AdminLeadController::class, 'update']);
        Route::post('/leads/{id}/notes', [AdminLeadController::class, 'addNote']);
        Route::delete('/leads/{id}', [AdminLeadController::class, 'destroy']);

        Route::get('/reviews', [AdminReviewController::class, 'index']);
        Route::put('/reviews/{id}', [AdminReviewController::class, 'update']);
        Route::delete('/reviews/{id}', [AdminReviewController::class, 'destroy']);
    });

    // Protected user routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/user', [AuthController::class, 'user']);
        Route::post('/reviews', [ReviewController::class, 'store']);
        Route::post('/reviews/{id}/helpful', [ReviewController::class, 'markHelpful']);
        Route::get('/leads', [LeadController::class, 'index']);
        Route::post('/shortlist', [PropertyController::class, 'shortlist']);
        Route::get('/shortlist', [PropertyController::class, 'getShortlist']);
        Route::post('/saved-searches', [SearchController::class, 'saveSearch']);
        Route::get('/saved-searches', [SearchController::class, 'getSavedSearches']);
    });
});
