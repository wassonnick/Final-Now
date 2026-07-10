<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\OwnerListing;
use App\Models\Property;
use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PropertyInventorySourceRuleTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
    }

    public function test_admin_created_property_defaults_to_societyflats_inventory_without_assignments(): void
    {
        $response = $this->withToken('admin-test-token')
            ->postJson('/api/admin/properties', [
                'title' => 'SocietyFlats managed rental',
                'listing_type' => 'Rent',
                'property_type' => 'Apartment',
                'locality' => 'Sector 54',
                'rent_amount' => 85000,
                'status' => 'Draft',
            ])
            ->assertCreated()
            ->assertJsonPath('data.source_type', 'societyflats_inventory')
            ->assertJsonPath('data.inventory_owner_type', 'societyflats')
            ->assertJsonPath('data.source_label', 'SocietyFlats Inventory');

        $property = Property::findOrFail($response->json('data.id'));
        $this->assertNull($property->owner_account_id);
        $this->assertNull($property->broker_account_id);
        $this->assertNull($property->source_lead_id);
        $this->assertNull($property->owner_listing_id);
        $this->assertNull($property->submitted_by_user_id);
    }

    public function test_admin_can_assign_property_to_owner_user(): void
    {
        $owner = Account::create([
            'name' => 'Owner Account',
            'phone' => '9876543210',
            'phone_normalized' => '9876543210',
            'role' => 'customer',
        ]);

        $response = $this->withToken('admin-test-token')
            ->postJson('/api/admin/properties', [
                'title' => 'Owner assigned rental',
                'listing_type' => 'Rent',
                'property_type' => 'Apartment',
                'locality' => 'Sector 54',
                'rent_amount' => 85000,
                'source_type' => 'owner_inventory',
                'owner_account_id' => $owner->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.source_type', 'owner_inventory')
            ->assertJsonPath('data.inventory_owner_type', 'owner')
            ->assertJsonPath('data.owner_account_id', $owner->id)
            ->assertJsonPath('data.source_label', 'Owner Assigned');

        $this->assertDatabaseHas('properties', [
            'id' => $response->json('data.id'),
            'owner_account_id' => $owner->id,
            'broker_account_id' => null,
            'source_type' => 'owner_inventory',
        ]);
    }

    public function test_admin_can_assign_property_to_broker(): void
    {
        $broker = Account::create([
            'name' => 'Broker Account',
            'phone' => '9876543211',
            'phone_normalized' => '9876543211',
            'role' => 'broker',
        ]);

        $response = $this->withToken('admin-test-token')
            ->postJson('/api/admin/properties', [
                'title' => 'Broker assigned sale',
                'listing_type' => 'Sale',
                'property_type' => 'Apartment',
                'locality' => 'Sector 65',
                'sale_price' => 45000000,
                'source_type' => 'broker_inventory',
                'broker_account_id' => $broker->id,
            ])
            ->assertCreated()
            ->assertJsonPath('data.source_type', 'broker_inventory')
            ->assertJsonPath('data.inventory_owner_type', 'broker')
            ->assertJsonPath('data.broker_account_id', $broker->id)
            ->assertJsonPath('data.source_label', 'Broker Assigned');

        $this->assertDatabaseHas('properties', [
            'id' => $response->json('data.id'),
            'broker_account_id' => $broker->id,
            'owner_account_id' => null,
            'source_type' => 'broker_inventory',
        ]);
    }

    public function test_owner_submitted_listing_never_becomes_societyflats_inventory_on_conversion(): void
    {
        $owner = Account::create([
            'name' => 'Listing Owner',
            'phone' => '9876543212',
            'phone_normalized' => '9876543212',
            'role' => 'customer',
        ]);

        $listing = OwnerListing::create([
            'account_id' => $owner->id,
            'name' => 'Listing Owner',
            'phone' => '9876543212',
            'purpose' => 'rent',
            'listing_type' => 'apartment',
            'locality' => 'Sector 70',
            'status' => 'submitted',
            'rent_amount' => 90000,
        ]);

        $this->withToken('admin-test-token')
            ->postJson("/api/admin/owner-listings/{$listing->id}/convert")
            ->assertCreated();

        $property = Property::findOrFail($listing->fresh()->property_id);
        $this->assertSame('owner_submitted_listing', $property->source_type);
        $this->assertSame('owner', $property->inventory_owner_type);
        $this->assertSame($listing->id, $property->owner_listing_id);
        $this->assertSame($owner->id, $property->owner_account_id);
        $this->assertSame($owner->id, $property->submitted_by_user_id);
    }

    public function test_public_property_response_hides_assignment_ids_and_private_contact_fields(): void
    {
        $society = $this->publishedSociety();
        $broker = Account::create([
            'name' => 'Hidden Broker',
            'phone' => '9876543213',
            'phone_normalized' => '9876543213',
            'role' => 'broker',
        ]);

        $response = $this->withToken('admin-test-token')
            ->postJson('/api/admin/properties', [
                'society_id' => $society->id,
                'title' => 'Broker verified home',
                'listing_type' => 'Rent',
                'property_type' => 'Apartment',
                'status' => 'Live',
                'locality' => 'Sector 54',
                'rent_amount' => 85000,
                'security_deposit' => '170000',
                'source_type' => 'broker_inventory',
                'broker_account_id' => $broker->id,
                'owner_name' => 'Private Broker',
                'owner_phone' => '9876543213',
                'verified' => true,
            ])
            ->assertCreated();

        $this->getJson('/api/properties/'.$response->json('data.slug'))
            ->assertOk()
            ->assertJsonPath('data.source_label', 'Broker Assigned')
            ->assertJsonMissingPath('data.owner_name')
            ->assertJsonMissingPath('data.owner_phone')
            ->assertJsonMissingPath('data.broker_account_id')
            ->assertJsonMissingPath('data.owner_account_id')
            ->assertJsonMissingPath('data.owner_listing_id')
            ->assertJsonMissingPath('data.submitted_by_user_id');
    }

    private function publishedSociety(): Society
    {
        return Society::create([
            'name' => 'Inventory Rule Society',
            'slug' => 'inventory-rule-society',
            'status' => 'Verified',
            'verification_status' => 'Verified',
            'is_published' => true,
            'published_at' => now(),
        ]);
    }
}
