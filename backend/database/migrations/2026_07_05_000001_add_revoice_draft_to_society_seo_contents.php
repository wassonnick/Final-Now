<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Draft-holding layer for re-voicing published SEO content without disturbing the live page.
 * A regenerated draft is parked in `revoice_draft` (the published columns and status are left
 * untouched, so the public page keeps serving the current copy) until an admin approves it,
 * at which point the draft is merged into the live columns and re-published.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('society_seo_contents', function (Blueprint $table) {
            $table->json('revoice_draft')->nullable()->after('schema_json');
            $table->timestamp('revoice_generated_at')->nullable()->after('revoice_draft');
        });
    }

    public function down(): void
    {
        Schema::table('society_seo_contents', function (Blueprint $table) {
            $table->dropColumn(['revoice_draft', 'revoice_generated_at']);
        });
    }
};
