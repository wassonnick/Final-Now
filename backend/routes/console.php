<?php

use App\Models\Property;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('inventory:clear-dummy-properties {--force}', function () {
    $count = Property::count();

    if ($count === 0) {
        $this->info('No properties to delete.');

        return;
    }

    if (! $this->option('force') && ! $this->confirm("Delete {$count} property records?")) {
        $this->warn('Aborted.');

        return;
    }

    Property::query()->delete();
    $this->info("Deleted {$count} property records.");
})->purpose('Delete current property inventory before uploading verified real listings');

Schedule::command('saved-searches:match')->dailyAt('08:00')->withoutOverlapping();
