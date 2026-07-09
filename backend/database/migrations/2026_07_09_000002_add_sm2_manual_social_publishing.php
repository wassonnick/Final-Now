<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('social_posts', function (Blueprint $table) {
            if (! Schema::hasColumn('social_posts', 'social_account_id')) {
                $table->foreignId('social_account_id')->nullable()->after('source_id')->constrained('social_accounts')->nullOnDelete();
            }
            if (! Schema::hasColumn('social_posts', 'external_post_id')) {
                $table->string('external_post_id')->nullable()->after('posted_at')->index();
            }
            if (! Schema::hasColumn('social_posts', 'external_post_url')) {
                $table->text('external_post_url')->nullable()->after('external_post_id');
            }
            if (! Schema::hasColumn('social_posts', 'publish_status')) {
                $table->string('publish_status')->default('not_published')->after('external_post_url')->index();
            }
            if (! Schema::hasColumn('social_posts', 'publish_error')) {
                $table->text('publish_error')->nullable()->after('publish_status');
            }
            if (! Schema::hasColumn('social_posts', 'publish_metadata')) {
                $table->json('publish_metadata')->nullable()->after('publish_error');
            }
        });

        Schema::table('social_accounts', function (Blueprint $table) {
            if (! Schema::hasColumn('social_accounts', 'oauth_state')) {
                $table->string('oauth_state')->nullable()->after('status')->index();
            }
            if (! Schema::hasColumn('social_accounts', 'last_connected_at')) {
                $table->timestamp('last_connected_at')->nullable()->after('token_expires_at');
            }
            if (! Schema::hasColumn('social_accounts', 'last_error')) {
                $table->text('last_error')->nullable()->after('last_connected_at');
            }
        });

        Schema::create('social_publish_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('social_post_id')->nullable()->constrained('social_posts')->nullOnDelete();
            $table->foreignId('social_account_id')->nullable()->constrained('social_accounts')->nullOnDelete();
            $table->string('platform')->index();
            $table->string('action')->index();
            $table->string('status')->index();
            $table->string('actor')->nullable();
            $table->string('external_post_id')->nullable();
            $table->text('message')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_publish_logs');

        Schema::table('social_posts', function (Blueprint $table) {
            if (Schema::hasColumn('social_posts', 'social_account_id')) {
                $table->dropConstrainedForeignId('social_account_id');
            }

            foreach (['external_post_id', 'external_post_url', 'publish_status', 'publish_error', 'publish_metadata'] as $column) {
                if (Schema::hasColumn('social_posts', $column)) {
                    $table->dropColumn($column);
                }
            }
        });

        Schema::table('social_accounts', function (Blueprint $table) {
            foreach (['oauth_state', 'last_connected_at', 'last_error'] as $column) {
                if (Schema::hasColumn('social_accounts', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
