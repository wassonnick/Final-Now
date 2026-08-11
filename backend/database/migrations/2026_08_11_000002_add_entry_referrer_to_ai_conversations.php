<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Where the visitor was standing when they asked.
 *
 * entry_path already recorded the advisor page itself — /ai-advisor?q=Compare+Tulip+Violet
 * — which is the destination, not the origin. So we could see what was asked and never
 * which page prompted it, and "the compare CTA drives questions but the society page does
 * not" was unanswerable.
 *
 * Internal paths are stored whole; an external referrer keeps only its host, because the
 * rest of another site's URL can carry the visitor's search terms and this table is
 * deliberately anonymous.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_conversations', function (Blueprint $table) {
            $table->string('entry_referrer', 255)->nullable()->after('entry_path');
        });
    }

    public function down(): void
    {
        Schema::table('ai_conversations', function (Blueprint $table) {
            $table->dropColumn('entry_referrer');
        });
    }
};
