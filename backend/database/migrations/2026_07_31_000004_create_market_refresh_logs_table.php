<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Market refresh is the most expensive automation we run — a grounded web-search call per
 * society, and the bulk of the AI bill. Until now it left only the newest values plus a
 * refreshed_at stamp on the society, so there was no way to answer the questions that
 * decide whether it is worth the money: how many societies actually changed, by how much,
 * and on whose authority.
 *
 * One row per society per refresh, holding both sides of every market field.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('market_refresh_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('society_id')->constrained()->cascadeOnDelete();
            $table->string('trigger', 30)->default('auto');   // auto | suggestion | admin
            $table->json('before');                            // market fields as they stood
            $table->json('after');                             // what the refresh wrote
            $table->json('changed_fields')->nullable();        // just the keys that moved
            $table->json('sources')->nullable();               // portals the answer cited
            $table->unsignedTinyInteger('confidence')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->index(['society_id', 'created_at']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('market_refresh_logs');
    }
};
