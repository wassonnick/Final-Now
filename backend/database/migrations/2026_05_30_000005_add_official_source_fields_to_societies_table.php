<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('societies', function (Blueprint $table) {
            $table->text('official_project_url')->nullable()->after('source_url');
            $table->text('official_developer_url')->nullable()->after('official_project_url');
            $table->text('official_brochure_url')->nullable()->after('official_developer_url');
            $table->text('official_floor_plan_url')->nullable()->after('official_brochure_url');
            $table->text('official_gallery_url')->nullable()->after('official_floor_plan_url');
            $table->string('official_source_status')->default('pending')->after('official_gallery_url');
            $table->timestamp('official_source_last_checked_at')->nullable()->after('official_source_status');
            $table->text('official_source_notes')->nullable()->after('official_source_last_checked_at');
            $table->text('rera_search_url')->nullable()->after('official_source_notes');
            $table->text('google_maps_url')->nullable()->after('rera_search_url');
            $table->unsignedSmallInteger('source_confidence_score')->default(0)->after('google_maps_url');
            $table->text('image_reference_url')->nullable()->after('gallery_images');
            $table->text('image_url')->nullable()->after('image_reference_url');
            $table->string('image_status')->default('placeholder')->after('image_url');
            $table->string('image_alt_text')->nullable()->after('image_status');
            $table->string('image_credit')->nullable()->after('image_alt_text');
            $table->text('image_license_notes')->nullable()->after('image_credit');
        });
    }

    public function down(): void
    {
        Schema::table('societies', function (Blueprint $table) {
            $table->dropColumn([
                'official_project_url',
                'official_developer_url',
                'official_brochure_url',
                'official_floor_plan_url',
                'official_gallery_url',
                'official_source_status',
                'official_source_last_checked_at',
                'official_source_notes',
                'rera_search_url',
                'google_maps_url',
                'source_confidence_score',
                'image_reference_url',
                'image_url',
                'image_status',
                'image_alt_text',
                'image_credit',
                'image_license_notes',
            ]);
        });
    }
};
