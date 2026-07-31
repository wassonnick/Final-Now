<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A bulk re-harvest is a few hundred queued jobs. Without a run row the admin who
 * started it has no way to tell the difference between "still working" and "the worker
 * died an hour ago", which is exactly the blindness the market-refresh log was added to
 * remove. One row per bulk run, counters updated as each job reports back.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('image_reharvest_runs', function (Blueprint $table) {
            $table->id();
            $table->string('scope', 40)->default('selection'); // selection | missing_images | unscreened | all
            $table->unsignedInteger('queued')->default(0);
            $table->unsignedInteger('completed')->default(0);
            $table->unsignedInteger('refreshed')->default(0);
            $table->unsignedInteger('republished')->default(0);
            $table->unsignedInteger('rejected_images')->default(0);
            $table->unsignedInteger('no_candidates')->default(0);
            $table->unsignedInteger('failed')->default(0);
            $table->boolean('screen_images')->default(true);
            $table->boolean('republish_cover')->default(true);
            $table->json('results')->nullable();  // capped tail, newest first
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();

            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('image_reharvest_runs');
    }
};
