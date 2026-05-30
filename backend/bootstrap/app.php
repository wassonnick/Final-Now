<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withCommands([
        \App\Console\Commands\ImportGurgaonReraSocieties::class,
        \App\Console\Commands\ImportGurgaonMasterSocieties::class,
        \App\Console\Commands\EnrichOfficialSocietySources::class,
        \App\Console\Commands\FetchSocietyFromUrl::class,
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(\App\Http\Middleware\ApiCors::class);
        $middleware->alias([
            'admin.api' => \App\Http\Middleware\EnsureAdminApiToken::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })
    ->create();
