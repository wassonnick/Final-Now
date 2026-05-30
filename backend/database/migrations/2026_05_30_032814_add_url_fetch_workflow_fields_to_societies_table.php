<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('societies', function (Blueprint $table) {
            $table->string('city')->nullable()->after('locality');
            $table->string('state')->nullable()->after('city');
            $table->string('society_type')->nullable()->after('state');
            $table->string('project_status')->nullable()->after('description');
            $table->string('configuration')->nullable()->after('project_status');
            $table->string('project_area')->nullable()->after('configuration');
            $table->string('unit_size_range')->nullable()->after('project_area');
            $table->string('rera_status')->nullable()->after('rera_number');
            $table->text('official_source_url')->nullable()->after('source_url');
            $table->text('official_rera_source_url')->nullable()->after('rera_search_url');
            $table->text('fields_to_verify')->nullable()->after('official_source_notes');
            $table->string('place_id')->nullable()->after('google_maps_url');
            $table->json('approved_gallery_image_urls')->nullable()->after('gallery_images');
            $table->boolean('image_approved_by_admin')->default(false)->after('image_status');
            $table->string('verification_status')->default('needs_verification')->after('status');
            $table->boolean('is_published')->default(false)->after('verification_status');
            $table->timestamp('published_at')->nullable()->after('is_published');
        });
    }

    public function down(): void
    {
        Schema::table('societies', function (Blueprint $table) {
            $table->dropColumn([
                'city',
                'state',
                'society_type',
                'project_status',
                'configuration',
                'project_area',
                'unit_size_range',
                'rera_status',
                'official_source_url',
                'official_rera_source_url',
                'fields_to_verify',
                'place_id',
                'approved_gallery_image_urls',
                'image_approved_by_admin',
                'verification_status',
                'is_published',
                'published_at',
            ]);
        });
    }
};
