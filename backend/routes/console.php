<?php

use Illuminate\Foundation\Inspiring;
use App\Models\Property;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('inventory:clear-dummy-properties {--force}', function () {
    $count = Property::count();

    if ($count === 0) {
        $this->info('No properties to delete.');
        return;
    }

    if (!$this->option('force') && !$this->confirm("Delete {$count} property records?")) {
        $this->warn('Aborted.');
        return;
    }

    Property::query()->delete();
    $this->info("Deleted {$count} property records.");
})->purpose('Delete current property inventory before uploading verified real listings');
