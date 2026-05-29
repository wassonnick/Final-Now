<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('societies', function (Blueprint $table) {
            $table->string('rera_number')->nullable()->after('brochure_name');
            $table->string('source_name')->nullable()->after('rera_number');
            $table->text('source_url')->nullable()->after('source_name');
            $table->string('data_quality')->default('Imported draft')->after('source_url');
            $table->timestamp('imported_at')->nullable()->after('data_quality');
        });
    }

    public function down(): void
    {
        Schema::table('societies', function (Blueprint $table) {
            $table->dropColumn(['rera_number', 'source_name', 'source_url', 'data_quality', 'imported_at']);
        });
    }
};
