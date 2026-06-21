<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            if (! Schema::hasColumn('accounts', 'api_token_hash')) {
                $table->string('api_token_hash', 64)->nullable()->index()->after('meta');
            }

            if (! Schema::hasColumn('accounts', 'api_token_created_at')) {
                $table->timestamp('api_token_created_at')->nullable()->after('api_token_hash');
            }
        });
    }

    public function down(): void
    {
        Schema::table('accounts', function (Blueprint $table) {
            if (Schema::hasColumn('accounts', 'api_token_created_at')) {
                $table->dropColumn('api_token_created_at');
            }

            if (Schema::hasColumn('accounts', 'api_token_hash')) {
                $table->dropColumn('api_token_hash');
            }
        });
    }
};
