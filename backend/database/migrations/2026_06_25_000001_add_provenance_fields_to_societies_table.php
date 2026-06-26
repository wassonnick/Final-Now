<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('societies', function (Blueprint $table) {
            // Per-field provenance: { "latitude": {"source":"google_places","confidence":95}, ... }
            if (! Schema::hasColumn('societies', 'field_sources')) {
                $table->json('field_sources')->nullable();
            }

            // Per-score signals/weights/confidence powering the deterministic scoring engine.
            if (! Schema::hasColumn('societies', 'score_breakdown')) {
                $table->json('score_breakdown')->nullable();
            }

            // Multi-source image candidates awaiting admin review (publish-gated).
            if (! Schema::hasColumn('societies', 'image_candidates')) {
                $table->json('image_candidates')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('societies', function (Blueprint $table) {
            foreach (['field_sources', 'score_breakdown', 'image_candidates'] as $column) {
                if (Schema::hasColumn('societies', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
