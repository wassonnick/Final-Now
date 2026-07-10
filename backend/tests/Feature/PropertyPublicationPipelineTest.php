<?php

namespace Tests\Feature;

use App\Models\Property;
use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PropertyPublicationPipelineTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
    }

    public function test_draft_inventory_can_be_saved_without_publication_fields(): void
    {
        $this->withToken('admin-test-token')->postJson('/api/admin/properties', [
            'title' => 'Owner draft home',
            'listing_type' => 'Rent',
            'property_type' => 'Apartment',
            'locality' => 'Sector 54',
            'price' => '85000',
            'status' => 'Draft',
        ])->assertCreated()->assertJsonPath('data.status', 'Draft');

        $this->getJson('/api/properties')->assertOk()->assertJsonPath('data.total', 0);
    }

    public function test_live_publication_requires_verified_real_inventory(): void
    {
        $society = $this->publishedSociety();

        $this->withToken('admin-test-token')->postJson('/api/admin/properties', [
            'society_id' => $society->id,
            'title' => 'Unverified rental home',
            'listing_type' => 'Rent',
            'price' => '85000',
            'security_deposit' => '170000',
            'status' => 'Live',
        ])->assertStatus(422)
            ->assertJsonValidationErrors(['verified', 'owner_name', 'owner_phone', 'images']);

        $this->assertSame(0, Property::count());
    }

    public function test_stock_placeholder_cannot_be_published(): void
    {
        $society = $this->publishedSociety();

        $payload = $this->validLivePayload($society);
        $payload['images'] = ['https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1200&q=85'];

        $this->withToken('admin-test-token')->postJson('/api/admin/properties', $payload)
            ->assertStatus(422)
            ->assertJsonValidationErrors(['images']);
    }

    public function test_verified_live_inventory_records_audit_timestamps_and_becomes_public(): void
    {
        $society = $this->publishedSociety();

        $response = $this->withToken('admin-test-token')
            ->postJson('/api/admin/properties', $this->validLivePayload($society))
            ->assertCreated()
            ->assertJsonPath('data.status', 'Live')
            ->assertJsonPath('data.verified', true)
            ->assertJsonPath('data.owner_verification_status', 'Verified');

        $property = Property::findOrFail($response->json('data.id'));
        $this->assertNotNull($property->verified_at);
        $this->assertNotNull($property->availability_checked_at);
        $this->assertNotNull($property->published_at);

        $this->getJson('/api/properties')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.id', $property->id)
            ->assertJsonMissingPath('data.data.0.owner_name')
            ->assertJsonMissingPath('data.data.0.owner_phone')
            ->assertJsonMissingPath('data.data.0.source_lead');

        $this->getJson('/api/properties/'.$property->slug)
            ->assertOk()
            ->assertJsonMissingPath('data.owner_name')
            ->assertJsonMissingPath('data.owner_phone');

        $this->withToken('admin-test-token')->getJson('/api/admin/properties/'.$property->id)
            ->assertOk()
            ->assertJsonPath('data.owner_name', 'Authorised Owner')
            ->assertJsonPath('data.owner_phone', '9876543210');
    }

    private function publishedSociety(): Society
    {
        return Society::create([
            'name' => 'Verified Parent Society',
            'slug' => 'verified-parent-society',
            'status' => 'Verified',
            'verification_status' => 'Verified',
            'is_published' => true,
            'published_at' => now(),
        ]);
    }

    private function validLivePayload(Society $society): array
    {
        return [
            'society_id' => $society->id,
            'society' => $society->name,
            'title' => 'Verified 3 BHK rental home',
            'listing_type' => 'Rent',
            'status' => 'Live',
            'locality' => 'Sector 54, Gurgaon',
            'price' => '85000',
            'security_deposit' => '170000',
            'owner_name' => 'Authorised Owner',
            'owner_phone' => '9876543210',
            'verified' => true,
            'images' => ['https://cdn.example.com/properties/verified-home.jpg'],
        ];
    }
}
