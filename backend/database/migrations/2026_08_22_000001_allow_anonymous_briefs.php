<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Let a brief be recorded without asking who wrote it.
 *
 * A brief was only ever stored if someone signed in to save it, because account_id was
 * required. Almost nobody signs in, so the richest demand signal on the site — nine
 * deliberate answers about what somebody wants and cannot find — was held in one browser's
 * local storage and thrown away when the tab closed. The demand-gap report, whose entire
 * job is to say which flats to go and sign, was left reading leads and little else.
 *
 * Anonymous briefs carry no account and no contact detail. They are identified only by a
 * random token the browser keeps, which exists so that editing a brief updates the same row
 * instead of filling the table with near-duplicates of one person changing their mind.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('saved_searches', function (Blueprint $table) {
            $table->foreignId('account_id')->nullable()->change();
            $table->string('anon_token', 64)->nullable()->unique()->after('account_id');
        });
    }

    public function down(): void
    {
        Schema::table('saved_searches', function (Blueprint $table) {
            $table->dropUnique(['anon_token']);
            $table->dropColumn('anon_token');
        });
    }
};
