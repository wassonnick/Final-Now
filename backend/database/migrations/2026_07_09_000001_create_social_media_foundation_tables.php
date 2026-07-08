<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('social_posts', function (Blueprint $table) {
            $table->id();
            $table->string('platform')->index();
            $table->string('post_type')->index();
            $table->string('title')->nullable();
            $table->text('hook')->nullable();
            $table->text('caption');
            $table->string('cta')->nullable();
            $table->json('hashtags')->nullable();
            $table->text('creative_prompt')->nullable();
            $table->text('image_prompt')->nullable();
            $table->string('image_style')->nullable();
            $table->json('carousel_slides')->nullable();
            $table->text('reel_script')->nullable();
            $table->string('source_type')->nullable();
            $table->unsignedBigInteger('source_id')->nullable();
            $table->string('risk_level')->default('medium')->index();
            $table->string('status')->default('needs_approval')->index();
            $table->timestamp('scheduled_at')->nullable()->index();
            $table->timestamp('posted_at')->nullable();
            $table->string('ai_model')->nullable();
            $table->string('ai_image_model')->nullable();
            $table->string('ai_prompt_version')->nullable();
            $table->timestamps();
            $table->index(['source_type', 'source_id']);
            $table->index('created_at');
        });

        Schema::create('social_post_assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_post_id')->nullable()->constrained('social_posts')->nullOnDelete();
            $table->string('asset_type')->index();
            $table->string('platform')->nullable()->index();
            $table->text('image_prompt')->nullable();
            $table->text('revised_prompt')->nullable();
            $table->string('storage_disk')->nullable();
            $table->string('file_path')->nullable();
            $table->text('public_url')->nullable();
            $table->string('mime_type')->nullable();
            $table->integer('width')->nullable();
            $table->integer('height')->nullable();
            $table->string('status')->default('needs_approval')->index();
            $table->string('risk_level')->default('medium')->index();
            $table->string('ai_model')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });

        Schema::create('social_accounts', function (Blueprint $table) {
            $table->id();
            $table->string('platform')->index();
            $table->string('account_name')->nullable();
            $table->string('account_handle')->nullable();
            $table->string('account_id')->nullable();
            $table->string('status')->default('not_connected')->index();
            $table->text('access_token_encrypted')->nullable();
            $table->text('refresh_token_encrypted')->nullable();
            $table->timestamp('token_expires_at')->nullable();
            $table->json('scopes')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_accounts');
        Schema::dropIfExists('social_post_assets');
        Schema::dropIfExists('social_posts');
    }
};
