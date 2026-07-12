<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Property;
use App\Models\Society;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
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
            'scheduler' => \App\Services\Ops\SchedulerHeartbeat::status(),
            'queue' => $this->queueHealth(),
        ]);
    }

    /**
     * Background queue backlog. If 'pending' stays high the worker isn't draining (imports
     * never auto-complete); 'failed' means jobs are erroring out and need inspection.
     *
     * @return array{pending:int,failed:int}
     */
    private function queueHealth(): array
    {
        return [
            'pending' => $this->countIfTableExists('jobs', fn () => DB::table('jobs')->count()),
            'failed' => $this->countIfTableExists('failed_jobs', fn () => DB::table('failed_jobs')->count()),
        ];
    }

    private function countIfTableExists(string $table, callable $count): int
    {
        if (!Schema::hasTable($table)) {
            return 0;
        }

        return (int) $count();
    }
}
