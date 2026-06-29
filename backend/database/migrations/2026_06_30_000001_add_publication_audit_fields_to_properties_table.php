<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->timestamp('verified_at')->nullable()->after('verified');
            $table->timestamp('availability_checked_at')->nullable()->after('verified_at');
            $table->timestamp('published_at')->nullable()->after('availability_checked_at');
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropColumn(['verified_at', 'availability_checked_at', 'published_at']);
        });
    }
};
