<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('campaign_pages', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('status')->default('draft'); // draft | published
            $table->json('payload'); // badge, titles, bullets, steps, faq, ctas, seo
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('campaign_pages');
    }
};
