<?php

use Database\Seeders\LandmarkSeeder;
use Illuminate\Database\Migrations\Migration;

/**
 * Get the expanded landmark list onto production.
 *
 * The original seeder runs from the create-table migration, which has already run
 * everywhere — so adding landmarks to the seeder file changes nothing on a deployed
 * environment. Migrations are the only thing `docker/start.sh` executes, so a new one is
 * how new reference data arrives.
 *
 * The seeder is idempotent (updateOrCreate on the slug), so this neither duplicates the
 * existing 33 nor overwrites anything learnt from Google Places since.
 */
return new class extends Migration
{
    public function up(): void
    {
        (new LandmarkSeeder)->run();
    }

    public function down(): void
    {
        // Landmarks are reference data — dropping the ones this added would break any page
        // already published from them, and re-running is harmless.
    }
};
