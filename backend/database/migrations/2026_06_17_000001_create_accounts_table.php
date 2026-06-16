<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('accounts', function (Blueprint $table) {
            $table->id();
            $table->string('role', 40)->default('customer')->index();
            $table->string('phone', 20)->index();
            $table->string('phone_normalized', 20)->unique();
            $table->string('name')->nullable();
            $table->string('email')->nullable()->index();
            $table->string('status', 40)->default('active')->index();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamp('phone_verified_at')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('accounts');
    }
};
