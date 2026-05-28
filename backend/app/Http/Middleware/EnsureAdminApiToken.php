<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminApiToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = config('services.admin_api_token');

        if (!$expected) {
            return $next($request);
        }

        $provided = $request->bearerToken() ?: $request->header('X-Admin-Token');

        if (!hash_equals((string) $expected, (string) $provided)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Admin authentication required.',
            ], 401);
        }

        return $next($request);
    }
}
