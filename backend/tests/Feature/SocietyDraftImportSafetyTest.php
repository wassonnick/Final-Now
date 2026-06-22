<?php

namespace Tests\Feature;

use App\Models\Property;
use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SocietyDraftImportSafetyTest extends TestCase
{
    use RefreshDatabase;

    public function test_unpublished_societies_are_hidden_even_with_a_public_status(): void
    {
        $society = Society::create([
            'name' => 'Hidden Verified Society',
            'slug' => 'hidden-verified-society',
            'status' => 'Verified',
            'is_published' => false,
        ]);

        $this->getJson('/api/societies')
            ->assertOk()
            ->assertJsonCount(0, 'data.data');

        $this->getJson('/api/societies/'.$society->slug)->assertNotFound();

        $society->update(['is_published' => true]);

        $this->getJson('/api/societies')
            ->assertOk()
            ->assertJsonCount(1, 'data.data');
    }

    public function test_public_properties_require_a_live_property_and_published_society(): void
    {
        $society = Society::create([
            'name' => 'Property Parent Society',
            'slug' => 'property-parent-society',
            'status' => 'Verified',
            'is_published' => false,
        ]);

        $live = Property::create([
            'society_id' => $society->id,
            'title' => 'Live Home',
            'slug' => 'live-home',
            'status' => 'Live',
            'price' => '50000',
        ]);

        Property::create([
            'society_id' => $society->id,
            'title' => 'Draft Home',
            'slug' => 'draft-home',
            'status' => 'Draft',
            'price' => '45000',
        ]);

        $this->getJson('/api/properties')
            ->assertOk()
            ->assertJsonCount(0, 'data.data');

        $this->getJson('/api/properties/'.$live->slug)->assertNotFound();

        $society->update(['is_published' => true]);

        $this->getJson('/api/properties')
            ->assertOk()
            ->assertJsonCount(1, 'data.data');

        $this->getJson('/api/societies/'.$society->slug)
            ->assertOk()
            ->assertJsonCount(1, 'data.properties');
    }

    public function test_master_import_creates_only_drafts_and_skips_duplicates(): void
    {
        $relativePath = 'database/imports/test-c112m-import.json';
        $absolutePath = base_path($relativePath);
        $row = [
            'name' => 'C112M Test Heights',
            'slug' => 'c112m-test-heights',
            'sector' => 'Sector 60',
            'locality' => 'Golf Course Extension Road',
            'city' => 'Gurugram',
            'developer_builder' => 'Test Builder',
            'amenities' => ['Clubhouse', 'Security'],
        ];

        file_put_contents($absolutePath, json_encode([$row, $row], JSON_PRETTY_PRINT));

        try {
            $this->artisan('societies:import-gurgaon-master', ['--file' => $relativePath])
                ->expectsOutputToContain('Skipped duplicate input row')
                ->expectsOutputToContain('Draft import complete.')
                ->expectsOutputToContain('SUMMARY')
                ->assertSuccessful();

            $this->assertDatabaseCount('societies', 1);
            $this->assertDatabaseHas('societies', [
                'slug' => 'c112m-test-heights',
                'status' => 'Draft',
                'verification_status' => 'needs_verification',
                'is_published' => false,
                'featured' => false,
                'image_approved_by_admin' => false,
            ]);
        } finally {
            if (is_file($absolutePath)) {
                unlink($absolutePath);
            }
        }
    }

    public function test_ai_advisor_does_not_expose_unpublished_inventory(): void
    {
        Society::create([
            'name' => 'Hidden AI Society',
            'slug' => 'hidden-ai-society',
            'status' => 'Verified',
            'is_published' => false,
        ]);

        $this->postJson('/api/ai/advisor', ['message' => 'Recommend a society in Gurgaon'])
            ->assertOk()
            ->assertJsonCount(0, 'matches');
    }
}
