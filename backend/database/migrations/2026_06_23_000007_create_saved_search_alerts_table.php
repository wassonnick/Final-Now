<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('saved_searches', function (Blueprint $table) {
            $table->timestamp('last_checked_at')->nullable()->after('last_alert_sent_at');
        });
        Schema::create('saved_search_alerts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('saved_search_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->constrained()->cascadeOnDelete();
            $table->foreignId('property_id')->constrained()->cascadeOnDelete();
            $table->string('channel', 20);
            $table->string('status', 20)->default('pending');
            $table->timestamp('sent_at')->nullable();
            $table->text('failure_reason')->nullable();
            $table->json('payload')->nullable();
            $table->timestamps();
            $table->unique(['saved_search_id', 'property_id']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_search_alerts');
        Schema::table('saved_searches', fn (Blueprint $table) => $table->dropColumn('last_checked_at'));
    }
};
