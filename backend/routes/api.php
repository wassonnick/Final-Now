<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\SocietyController;
use App\Http\Controllers\Api\PropertyController;
use App\Http\Controllers\Api\SearchController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\AIController;
use App\Http\Controllers\Api\AuthController;

Route::prefix('v1')->group(function () {

    // Public Routes
    Route::get('/societies', [SocietyController::class, 'index']);
    Route::get('/societies/featured', [SocietyController::class, 'featured']);
    Route::get('/societies/{slug}', [SocietyController::class, 'show']);
    Route::get('/societies/{id}/intelligence', [SocietyController::class, 'intelligence']);
    Route::get('/societies/{id}/properties', [PropertyController::class, 'bySociety']);
    Route::get('/societies/{id}/reviews', [ReviewController::class, 'bySociety']);

    Route::get('/properties', [PropertyController::class, 'index']);
    Route::get('/properties/{slug}', [PropertyController::class, 'show']);
    Route::get('/properties/{id}/similar', [PropertyController::class, 'similar']);

    Route::get('/search', [SearchController::class, 'search']);
    Route::get('/search/autocomplete', [SearchController::class, 'autocomplete']);

    Route::get('/localities/{id}/societies', [SocietyController::class, 'byLocality']);

    // AI Routes
    Route::post('/ai/recommendations', [AIController::class, 'recommendations']);
    Route::get('/ai/rent-estimate', [AIController::class, 'rentEstimate']);

    // Auth Routes
    Route::post('/auth/register', [AuthController::class, 'register']);
    Route::post('/auth/login', [AuthController::class, 'login']);
    Route::post('/auth/otp/send', [AuthController::class, 'sendOtp']);
    Route::post('/auth/otp/verify', [AuthController::class, 'verifyOtp']);

    // Protected Routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/user', [AuthController::class, 'user']);

        Route::post('/reviews', [ReviewController::class, 'store']);
        Route::post('/reviews/{id}/helpful', [ReviewController::class, 'markHelpful']);

        Route::post('/leads', [LeadController::class, 'store']);
        Route::get('/leads', [LeadController::class, 'index']);

        Route::post('/shortlist', [PropertyController::class, 'shortlist']);
        Route::get('/shortlist', [PropertyController::class, 'getShortlist']);

        Route::post('/saved-searches', [SearchController::class, 'saveSearch']);
        Route::get('/saved-searches', [SearchController::class, 'getSavedSearches']);
    });
});
