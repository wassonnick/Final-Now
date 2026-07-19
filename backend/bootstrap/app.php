<?php

use App\Console\Commands\EnrichOfficialSocietySources;
use App\Console\Commands\FetchSocietyFromUrl;
use App\Console\Commands\ImportGurgaonMasterSocieties;
use App\Console\Commands\ImportGurgaonReraSocieties;
use App\Console\Commands\MatchSavedSearches;
use App\Console\Commands\TestResendEmail;
use App\Http\Middleware\ApiCors;
use App\Http\Middleware\EnsureAdminApiToken;
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
        ImportGurgaonReraSocieties::class,
        ImportGurgaonMasterSocieties::class,
        EnrichOfficialSocietySources::class,
        FetchSocietyFromUrl::class,
        MatchSavedSearches::class,
        TestResendEmail::class,
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->append(ApiCors::class);
        $middleware->alias([
            'admin.api' => EnsureAdminApiToken::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })
    ->create();
