<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `area` is what was typed into the scan box — "West Delhi" — which is a search term, not a
 * place a society sits in. Importing eighteen societies with that as their locality would
 * have created one meaningless locality page instead of Rohini, Karol Bagh and Paschim
 * Vihar. The real locality is already in the Google address; it just was not being read.
 *
 * import_job_id closes the other half: the queue said "Handled" the moment a job was
 * created, so a queued import, a finished one and a failed one all looked identical.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('society_import_candidates', function (Blueprint $table) {
            $table->string('locality')->nullable()->after('area');
            $table->unsignedBigInteger('import_job_id')->nullable()->after('society_id');
        });
    }

    public function down(): void
    {
        Schema::table('society_import_candidates', function (Blueprint $table) {
            $table->dropColumn(['locality', 'import_job_id']);
        });
    }
};
