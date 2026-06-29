<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\Society;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Schema;

class AdminStatsController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'societies' => $this->countIfTableExists('societies', fn () => Society::count()),
            'featured_societies' => $this->countIfTableExists('societies', fn () => Society::where('featured', true)->count()),
            'properties' => $this->countIfTableExists('properties', fn () => Property::count()),
            'live_properties' => $this->countIfTableExists('properties', fn () => Property::publiclyAvailable()->count()),
        ]);
    }

    private function countIfTableExists(string $table, callable $count): int
    {
        if (!Schema::hasTable($table)) {
            return 0;
        }

        return (int) $count();
    }
}
