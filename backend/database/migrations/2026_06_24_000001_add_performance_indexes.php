<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('societies', function (Blueprint $table) {
            $table->index(['is_published', 'status'], 'societies_is_published_status_idx');
            $table->index('locality', 'societies_locality_idx');
            $table->index('sector', 'societies_sector_idx');
            $table->index('builder', 'societies_builder_idx');
            $table->index('created_at', 'societies_created_at_idx');
        });

        Schema::table('properties', function (Blueprint $table) {
            $table->index('status', 'properties_status_idx');
            $table->index('listing_type', 'properties_listing_type_idx');
            $table->index('created_at', 'properties_created_at_idx');
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->index('status', 'leads_status_idx');
            $table->index('source', 'leads_source_idx');
            $table->index('phone', 'leads_phone_idx');
            $table->index('created_at', 'leads_created_at_idx');
        });
    }

    public function down(): void
    {
        Schema::table('societies', function (Blueprint $table) {
            $table->dropIndex('societies_is_published_status_idx');
            $table->dropIndex('societies_locality_idx');
            $table->dropIndex('societies_sector_idx');
            $table->dropIndex('societies_builder_idx');
            $table->dropIndex('societies_created_at_idx');
        });

        Schema::table('properties', function (Blueprint $table) {
            $table->dropIndex('properties_status_idx');
            $table->dropIndex('properties_listing_type_idx');
            $table->dropIndex('properties_created_at_idx');
        });

        Schema::table('leads', function (Blueprint $table) {
            $table->dropIndex('leads_status_idx');
            $table->dropIndex('leads_source_idx');
            $table->dropIndex('leads_phone_idx');
            $table->dropIndex('leads_created_at_idx');
        });
    }
};
