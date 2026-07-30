<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Journey tracking for the AI assistant: where a conversation came from and how it
 * ended. Conversations stay anonymous — these columns record page context and
 * outcome, never identity.
 *
 * Also stores the tappable reply options the model offered with each answer, so a
 * reloaded thread restores the same chips it showed live.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ai_conversations', function (Blueprint $table) {
            // How they got here.
            $table->string('entry_source', 40)->nullable()->after('model');
            $table->string('entry_label', 60)->nullable()->after('entry_source');
            $table->string('entry_path', 255)->nullable()->after('entry_label');
            // How it ended.
            $table->string('outcome', 40)->nullable()->after('entry_path');
            $table->string('outcome_detail', 160)->nullable()->after('outcome');
            $table->timestamp('ended_at')->nullable()->after('outcome_detail');

            $table->index(['entry_source', 'last_message_at']);
            $table->index(['outcome', 'last_message_at']);
        });

        Schema::table('ai_messages', function (Blueprint $table) {
            $table->json('suggested_replies')->nullable()->after('context_entities');
        });
    }

    public function down(): void
    {
        Schema::table('ai_conversations', function (Blueprint $table) {
            $table->dropIndex(['entry_source', 'last_message_at']);
            $table->dropIndex(['outcome', 'last_message_at']);
            $table->dropColumn(['entry_source', 'entry_label', 'entry_path', 'outcome', 'outcome_detail', 'ended_at']);
        });

        Schema::table('ai_messages', function (Blueprint $table) {
            $table->dropColumn('suggested_replies');
        });
    }
};
