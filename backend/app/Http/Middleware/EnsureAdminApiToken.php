<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAdminApiToken
{
    public function handle(Request $request, Closure $next): Response
    {
        $expected = (string) config('services.admin_api_token', '');

        $provided = (string) (
            $request->bearerToken()
            ?: $request->header('X-Admin-Token')
            ?: ''
        );

        if ($expected === '' || $provided === '' || !hash_equals($expected, $provided)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthorized admin request.',
            ], 401);
        }

        return $next($request);
    }
}
