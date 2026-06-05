<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            if (!Schema::hasColumn('leads', 'property_title')) {
                $table->string('property_title')->nullable();
            }

            if (!Schema::hasColumn('leads', 'property_slug')) {
                $table->string('property_slug')->nullable();
            }

            if (!Schema::hasColumn('leads', 'society_name')) {
                $table->string('society_name')->nullable();
            }

            if (!Schema::hasColumn('leads', 'message')) {
                $table->text('message')->nullable();
            }

            if (!Schema::hasColumn('leads', 'requirement')) {
                $table->text('requirement')->nullable();
            }

            if (!Schema::hasColumn('leads', 'priority')) {
                $table->string('priority')->default('Warm');
            }

            if (!Schema::hasColumn('leads', 'follow_up_at')) {
                $table->timestamp('follow_up_at')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('leads', function (Blueprint $table) {
            $columns = [
                'property_title',
                'property_slug',
                'society_name',
                'message',
                'requirement',
                'priority',
                'follow_up_at',
            ];

            foreach ($columns as $column) {
                if (Schema::hasColumn('leads', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
