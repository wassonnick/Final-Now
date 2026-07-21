<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('accounts')->cascadeOnDelete();
            $table->string('device_id', 120);
            $table->string('platform', 40)->default('unknown')->index();
            $table->text('expo_push_token')->nullable();
            $table->boolean('saved_search_alerts')->default(true);
            $table->boolean('site_visit_reminders')->default(true);
            $table->boolean('owner_listing_updates')->default(true);
            $table->timestamp('last_registered_at')->nullable();
            $table->timestamp('disabled_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->unique(['account_id', 'device_id']);
            $table->index(['account_id', 'disabled_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_devices');
    }
};
