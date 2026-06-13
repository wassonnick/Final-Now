<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->foreignId('source_lead_id')
                ->nullable()
                ->after('society_id')
                ->constrained('leads')
                ->nullOnDelete();

            $table->string('owner_name')->nullable()->after('source_lead_id');
            $table->string('owner_phone', 30)->nullable()->after('owner_name');
            $table->string('owner_verification_status')->nullable()->after('owner_phone');
            $table->text('owner_notes')->nullable()->after('owner_verification_status');
        });
    }

    public function down(): void
    {
        Schema::table('properties', function (Blueprint $table) {
            $table->dropConstrainedForeignId('source_lead_id');
            $table->dropColumn([
                'owner_name',
                'owner_phone',
                'owner_verification_status',
                'owner_notes',
            ]);
        });
    }
};
