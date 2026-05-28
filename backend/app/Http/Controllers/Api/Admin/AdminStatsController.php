<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Lead;
use App\Models\Property;
use App\Models\Review;
use App\Models\Society;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class AdminStatsController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'societies' => Society::count(),
            'featured_societies' => Society::where('featured', true)->count(),
            'properties' => Property::count(),
            'live_properties' => Property::where('status', 'Live')->count(),
            'leads' => Lead::count(),
            'new_leads' => Lead::whereIn('status', ['New', 'new'])->count(),
            'pending_reviews' => Review::whereIn('status', ['Pending', 'pending'])->count(),
            'users' => User::count(),
        ]);
    }
}
