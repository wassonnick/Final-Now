<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Images contributed by the people who are actually entitled to give them: residents and
 * owners who live there, the RWA, and the builder.
 *
 * Every other source we have carries a rights problem we can only paper over. Google
 * Places photos may not be stored and must be served live through an API that has just
 * stopped answering. Images scraped from a developer's site are their copyright, so each
 * one sits behind a manual confirmation that someone has to make on trust. Neither
 * scales, and neither produces a picture for a project nobody has photographed yet.
 *
 * A contribution records WHO granted the right and WHAT they attested, at the moment they
 * uploaded. That is the part that makes publishing defensible later, so it is stored
 * alongside the file rather than inferred from it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('society_image_contributions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('society_id')->constrained()->cascadeOnDelete();
            $table->foreignId('account_id')->nullable()->constrained()->nullOnDelete();

            // Who they are entitled to speak for. Decides which publishable image status
            // an approval maps to, so it is not free text.
            $table->string('contributor_role', 20); // resident | owner | rwa | builder | staff
            $table->string('contributor_name')->nullable();
            $table->string('contributor_email')->nullable();
            $table->string('contributor_phone', 30)->nullable();

            $table->string('image_path');            // on the uploads disk
            $table->string('caption')->nullable();
            $table->unsignedInteger('width')->default(0);
            $table->unsignedInteger('height')->default(0);

            // The grant itself. rights_statement is the exact wording shown at upload, kept
            // verbatim so a later dispute is answered by the record and not by memory.
            $table->boolean('rights_granted')->default(false);
            $table->text('rights_statement')->nullable();
            $table->timestamp('rights_granted_at')->nullable();

            $table->string('status', 20)->default('pending'); // pending | approved | rejected
            $table->json('screen')->nullable();               // vision-screen verdict, when it ran
            $table->text('review_notes')->nullable();
            $table->string('reviewed_by')->nullable();
            $table->timestamp('reviewed_at')->nullable();
            $table->boolean('used_as_cover')->default(false);

            $table->timestamps();

            $table->index(['society_id', 'status']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('society_image_contributions');
    }
};
