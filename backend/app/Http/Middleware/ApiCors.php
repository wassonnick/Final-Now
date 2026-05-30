<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiCors
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->isMethod('OPTIONS')) {
            return $this->withCors(response('', 204), $request);
        }

        return $this->withCors($next($request), $request);
    }

    private function withCors(Response $response, Request $request): Response
    {
        $origin = $request->headers->get('Origin');
        $allowed = $this->allowedOrigin($origin);

        if ($allowed) {
            $response->headers->set('Access-Control-Allow-Origin', $allowed);
            $response->headers->set('Vary', 'Origin');
        }

        $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token, X-Requested-With, Accept, Origin');
        $response->headers->set('Access-Control-Max-Age', '86400');

        return $response;
    }

    private function allowedOrigin(?string $origin): ?string
    {
        if (!$origin) {
            return '*';
        }

        $configured = array_filter(array_map(
            'trim',
            explode(',', (string) env('CORS_ALLOWED_ORIGINS', 'https://final-now-1.onrender.com,https://final-now.onrender.com,http://localhost:5173,http://localhost:4173'))
        ));

        if (in_array('*', $configured, true) || in_array($origin, $configured, true)) {
            return $origin;
        }

        return str_ends_with(parse_url($origin, PHP_URL_HOST) ?: '', '.onrender.com') ? $origin : null;
    }
}
