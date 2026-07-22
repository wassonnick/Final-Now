<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('account_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('account_id')->constrained('accounts')->cascadeOnDelete();
            $table->string('event', 80)->index();
            $table->string('title', 160);
            $table->text('body')->nullable();
            $table->string('status', 30)->default('unread')->index();
            $table->json('data')->nullable();
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['account_id', 'status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('account_notifications');
    }
};
