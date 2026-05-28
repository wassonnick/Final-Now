<?php
use App\Http\Controllers\Api\LeadController;
use App\Http\Controllers\Api\PropertyController;
use App\Http\Controllers\Api\SocietyController;
use Illuminate\Support\Facades\Route;

Route::get('/health', fn () => response()->json(['status' => 'ok']));

Route::get('/societies', [SocietyController::class, 'index']);
Route::get('/societies/{slug}', [SocietyController::class, 'show']);
Route::get('/properties', [PropertyController::class, 'index']);
Route::get('/properties/{idOrSlug}', [PropertyController::class, 'show']);
Route::post('/leads', [LeadController::class, 'store']);
Route::post('/leads', [LeadController::class, 'store']);
Route::prefix('admin')->group(function () {
    Route::apiResource('societies', SocietyController::class)->except(['create', 'edit']);
    Route::apiResource('properties', PropertyController::class)->except(['create', 'edit']);
    Route::apiResource('leads', LeadController::class)->only(['index', 'update', 'destroy']);
});
