<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('verified_society_import_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('job_type', 30);
            $table->json('input_payload')->nullable();
            $table->string('input_file_name')->nullable();
            $table->text('input_file_path')->nullable();
            $table->string('status', 40)->default('pending')->index();
            $table->unsignedInteger('total_rows')->default(0);
            $table->unsignedInteger('processed_rows')->default(0);
            $table->unsignedInteger('created_societies_count')->default(0);
            $table->unsignedInteger('updated_societies_count')->default(0);
            $table->unsignedInteger('skipped_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->unsignedTinyInteger('overall_confidence')->nullable();
            $table->json('error_log')->nullable();
            $table->json('summary')->nullable();
            $table->string('created_by')->nullable();
            $table->timestamps();
        });

        Schema::create('verified_society_import_sources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_job_id')->nullable()->constrained('verified_society_import_jobs')->nullOnDelete();
            $table->foreignId('society_id')->nullable()->constrained()->nullOnDelete();
            $table->string('source_type', 50)->index();
            $table->string('source_name')->nullable();
            $table->text('source_url')->nullable();
            $table->unsignedTinyInteger('source_priority')->nullable();
            $table->json('raw_response')->nullable();
            $table->text('raw_response_path')->nullable();
            $table->timestamp('fetched_at')->nullable();
            $table->unsignedTinyInteger('confidence_score')->nullable();
            $table->string('status', 40)->nullable();
            $table->text('error_message')->nullable();
            $table->timestamps();
        });

        Schema::create('verified_society_field_sources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_job_id')->nullable()->constrained('verified_society_import_jobs')->nullOnDelete();
            $table->foreignId('society_id')->nullable()->constrained()->nullOnDelete();
            $table->string('field_name')->index();
            $table->text('field_value')->nullable();
            $table->text('raw_value')->nullable();
            $table->text('normalized_value')->nullable();
            $table->string('source_type', 50)->index();
            $table->string('source_name')->nullable();
            $table->text('source_url')->nullable();
            $table->unsignedTinyInteger('confidence_score')->nullable();
            $table->boolean('is_selected_value')->default(false);
            $table->boolean('needs_review')->default(true);
            $table->boolean('admin_approved')->default(false);
            $table->boolean('admin_rejected')->default(false);
            $table->text('review_notes')->nullable();
            $table->timestamps();
            $table->index(['society_id', 'needs_review']);
        });

        Schema::create('verified_society_import_rows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_job_id')->constrained('verified_society_import_jobs')->cascadeOnDelete();
            $table->unsignedInteger('row_number');
            $table->json('input_data');
            $table->json('normalized_data')->nullable();
            $table->foreignId('matched_society_id')->nullable()->constrained('societies')->nullOnDelete();
            $table->foreignId('created_society_id')->nullable()->constrained('societies')->nullOnDelete();
            $table->string('status', 40)->index();
            $table->unsignedTinyInteger('confidence_score')->nullable();
            $table->json('warnings')->nullable();
            $table->json('errors')->nullable();
            $table->timestamps();
            $table->unique(['import_job_id', 'row_number']);
        });

        Schema::create('verified_society_import_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('import_job_id')->nullable()->constrained('verified_society_import_jobs')->nullOnDelete();
            $table->foreignId('society_id')->nullable()->constrained()->nullOnDelete();
            $table->string('image_type', 30);
            $table->string('source_type', 50);
            $table->text('source_url')->nullable();
            $table->text('google_photo_reference')->nullable();
            $table->text('local_path')->nullable();
            $table->string('alt_text')->nullable();
            $table->text('caption')->nullable();
            $table->text('attribution')->nullable();
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->unsignedTinyInteger('confidence_score')->nullable();
            $table->boolean('needs_review')->default(true);
            $table->boolean('admin_approved')->default(false);
            $table->boolean('admin_rejected')->default(false);
            $table->timestamps();
            $table->index(['society_id', 'needs_review']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('verified_society_import_images');
        Schema::dropIfExists('verified_society_import_rows');
        Schema::dropIfExists('verified_society_field_sources');
        Schema::dropIfExists('verified_society_import_sources');
        Schema::dropIfExists('verified_society_import_jobs');
    }
};
