<?php

use Illuminate\Support\Facades\Route;

Route::get('/societies', fn () => response()->json([
    'status' => 'ok',
    'message' => 'Societies API working',
    'data' => [],
]));

Route::get('/properties', fn () => response()->json([
    'status' => 'ok',
    'message' => 'Properties API working',
    'data' => [],
]));

Route::get('/leads', fn () => response()->json([
    'status' => 'ok',
    'message' => 'Leads API working',
    'data' => [],
]));