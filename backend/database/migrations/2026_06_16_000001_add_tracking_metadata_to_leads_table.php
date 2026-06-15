<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $columns = [
                'source_page',
                'page_url',
                'referrer',
                'cta_label',
                'utm_source',
                'utm_medium',
                'utm_campaign',
                'utm_term',
                'utm_content',
                'lead_intent',
                'search_query',
                'ai_query',
                'entity_type',
                'entity_slug',
            ];

            foreach ($columns as $column) {
                if (!Schema::hasColumn('leads', $column)) {
                    $table->string($column)->nullable()->after('source');
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $columns = [
                'source_page',
                'page_url',
                'referrer',
                'cta_label',
                'utm_source',
                'utm_medium',
                'utm_campaign',
                'utm_term',
                'utm_content',
                'lead_intent',
                'search_query',
                'ai_query',
                'entity_type',
                'entity_slug',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('leads', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
