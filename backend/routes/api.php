<?php
use App\Http\Controllers\Api\Admin\ImageUploadController;
use App\Http\Controllers\Api\Admin\AdminStatsController;
use App\Http\Controllers\Api\Admin\AdminAccountController;
use App\Http\Controllers\Api\Admin\SocietyImportController;
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\PropertyController;
use App\Http\Controllers\Api\SocietyController;
use App\Http\Controllers\Api\AIController;
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
Route::prefix('admin')->middleware('admin.api')->group(function () {
    Route::get('/stats', AdminStatsController::class);
    Route::post('/uploads/images', [ImageUploadController::class, 'store']);
    Route::post('/societies/fetch-from-url', [SocietyController::class, 'fetchFromUrl']);
    Route::post('/societies/fetch-from-brochure', [SocietyController::class, 'fetchFromBrochure']);
    Route::post('/societies/create-from-fetched-data', [SocietyController::class, 'createFromFetchedData']);
    Route::post('/societies/{society}/enrich', [SocietyController::class, 'enrich']);
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
    Route::apiResource('societies', SocietyController::class)->except(['create', 'edit']);
    Route::apiResource('properties', PropertyController::class)->except(['create', 'edit']);
    Route::apiResource('leads', LeadController::class)->only(['index', 'show', 'update', 'destroy']);
    Route::apiResource('accounts', AdminAccountController::class)->only(['index', 'show', 'update']);
});


Route::prefix('accounts')->group(function () {
    Route::post('/upsert', [\App\Http\Controllers\Api\AccountController::class, 'upsert']);
    Route::post('/request-otp', [\App\Http\Controllers\Api\AccountController::class, 'requestOtp']);
    Route::post('/verify-otp', [\App\Http\Controllers\Api\AccountController::class, 'verifyOtp']);
    Route::get('/me', [\App\Http\Controllers\Api\AccountController::class, 'me']);
});

