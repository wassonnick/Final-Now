<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('societies', function (Blueprint $table) {
            // The admin-chosen Google Places photo reference. Served live, on demand,
            // via the publish-gated photo proxy (never cached) so a specific gallery
            // photo can be the cover while honouring Google attribution terms.
            if (! Schema::hasColumn('societies', 'image_photo_reference')) {
                $table->text('image_photo_reference')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('societies', function (Blueprint $table) {
            if (Schema::hasColumn('societies', 'image_photo_reference')) {
                $table->dropColumn('image_photo_reference');
            }
        });
    }
};
