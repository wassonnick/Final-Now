<?php

use Database\Seeders\LandmarkSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The places people actually name when they describe where they want to live.
 *
 * Nobody says "show me Sector 24". They say "near Ambience Mall", "walking distance from
 * Cyber Hub", "close to my office in Udyog Vihar" — a landmark they know and a distance
 * they can picture. Search only understood society names, sectors and localities, so every
 * one of those queries returned nothing.
 *
 * Seeded with the landmarks worth knowing in NCR, and filled in from Google Places for
 * anything else a visitor names — once per landmark, then it is ours.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('landmarks', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            // "cyber city", "cyberhub", "dlf cyber city" all mean one place to a person.
            $table->json('aliases')->nullable();
            $table->string('category', 40)->index();
            $table->string('city')->nullable()->index();
            $table->decimal('latitude', 11, 8);
            $table->decimal('longitude', 11, 8);
            $table->string('source', 30)->default('curated');
            $table->string('place_id')->nullable()->unique();
            $table->unsignedInteger('searches')->default(0);
            $table->timestamps();
        });

        // Deploy runs migrations and nothing else, so the curated list has to arrive here or
        // it never arrives at all — a landmark search on a fresh database would fall through
        // to a paid Google lookup for places we already know the coordinates of. The seeder
        // stays the single source of the list and is idempotent, so re-running is harmless.
        (new LandmarkSeeder)->run();
    }

    public function down(): void
    {
        Schema::dropIfExists('landmarks');
    }
};
