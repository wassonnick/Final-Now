<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Enable PostgreSQL trigram similarity so the AI assistant can match misspelled society
     * names ("Antaliyas" -> "M3M Antalya Hills"). No-op on non-Postgres (tests use SQLite); the
     * search code also degrades gracefully if the extension can't be created (privilege limits).
     */
    public function up(): void
    {
        if (DB::connection()->getDriverName() !== 'pgsql') {
            return;
        }

        try {
            DB::statement('CREATE EXTENSION IF NOT EXISTS pg_trgm');
        } catch (\Throwable $e) {
            // Managed Postgres may restrict CREATE EXTENSION — fuzzy match simply stays off.
            report($e);
        }
    }

    public function down(): void
    {
        // Leave the extension in place; other features may rely on it and dropping needs superuser.
    }
};
