<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Societies that exist in the market but not in the catalogue.
 *
 * Persisted rather than recomputed because a scan costs a paid Places call, because a
 * dismissal has to stick — "this is a broker office, not a society" is knowledge, and
 * rediscovering it every week would make the queue useless — and because the gap between
 * two scans is the interesting signal: a name that appears for the first time this month
 * is a new launch.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('society_import_candidates', function (Blueprint $table) {
            $table->id();
            $table->string('place_id')->unique();
            $table->string('name');
            $table->string('normalised_name')->index();
            $table->string('address', 500)->nullable();
            $table->string('area')->nullable()->index();
            $table->string('city')->nullable()->index();
            $table->unsignedBigInteger('city_id')->nullable()->index();
            $table->decimal('latitude', 11, 8)->nullable();
            $table->decimal('longitude', 11, 8)->nullable();
            $table->json('types')->nullable();
            $table->unsignedInteger('rating_count')->nullable();
            // new | likely_duplicate | dismissed | imported
            $table->string('status')->default('new')->index();
            $table->string('status_reason')->nullable();
            $table->foreignId('society_id')->nullable()->constrained()->nullOnDelete();
            $table->timestamp('first_seen_at')->nullable();
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('society_import_candidates');
    }
};
