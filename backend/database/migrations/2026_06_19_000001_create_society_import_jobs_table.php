<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('society_import_jobs')) {
            return;
        }

        Schema::create('society_import_jobs', function (Blueprint $table) {
            $table->id();
            $table->string('type', 50);
            $table->longText('input');
            $table->string('source', 120)->nullable();
            $table->string('status', 30)->default('queued');
            $table->json('logs')->nullable();
            $table->unsignedBigInteger('result_society_id')->nullable();
            $table->integer('imported_count')->default(0);
            $table->integer('failed_count')->default(0);
            $table->json('results')->nullable();
            $table->string('triggered_by', 255)->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->foreign('result_society_id')
                ->references('id')
                ->on('societies')
                ->nullOnDelete();

            $table->index('type');
            $table->index('status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('society_import_jobs');
    }
};
