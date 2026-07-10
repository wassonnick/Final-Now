<?php

namespace Tests\Feature;

use App\Models\OwnerListing;
use App\Models\Property;
use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PropertyFormSimplificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
    }

    public function test_public_society_lookup_returns_only_published_safe_autofill_payload(): void
    {
        $published = Society::create([
            'name' => 'Published Lookup Society',
            'slug' => 'published-lookup-society',
            'builder' => 'DLF Limited',
            'sector' => 'Sector 54',
            'locality' => 'Golf Course Road',
            'city' => 'Gurugram',
            'status' => 'Verified',
            'verification_status' => 'Verified',
            'is_published' => true,
            'amenities' => ['Clubhouse', 'Swimming Pool'],
        ]);

        Society::create([
            'name' => 'Draft Lookup Society',
            'slug' => 'draft-lookup-society',
            'status' => 'Draft',
            'verification_status' => 'Needs Review',
            'is_published' => false,
            'amenities' => ['Private Notes'],
        ]);

        $this->getJson('/api/societies/lookup')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $published->id)
            ->assertJsonPath('data.0.approved_amenities.0', 'Clubhouse')
            ->assertJsonMissingPath('data.0.address')
            ->assertJsonMissingPath('data.0.published_status');
    }

    public function test_admin_society_lookup_includes_drafts_and_admin_metadata(): void
    {
        Society::create([
            'name' => 'Admin Draft Society',
            'slug' => 'admin-draft-society',
            'sector' => 'Sector 89',
            'status' => 'Draft',
            'verification_status' => 'Needs Review',
            'is_published' => false,
            'address' => 'Internal review address',
        ]);

        $this->getJson('/api/admin/societies/lookup')->assertUnauthorized();

        $this->withToken('admin-test-token')
            ->getJson('/api/admin/societies/lookup')
            ->assertOk()
            ->assertJsonPath('data.0.name', 'Admin Draft Society')
            ->assertJsonPath('data.0.published_status', 'draft')
            ->assertJsonPath('data.0.address', 'Internal review address');
    }

    public function test_admin_can_save_sparse_property_draft_with_free_text_locality(): void
    {
        $response = $this->withToken('admin-test-token')
            ->postJson('/api/admin/properties', [
                'listing_type' => 'Rent',
                'property_type' => 'Apartment',
                'locality' => 'New Locality Free Text',
                'rent_amount' => 85000,
            ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'Draft')
            ->assertJsonPath('data.locality', 'New Locality Free Text')
            ->assertJsonPath('data.rent_unit', 'monthly');

        $this->assertDatabaseHas('properties', [
            'id' => $response->json('data.id'),
            'status' => 'Draft',
            'listing_type' => 'Rent',
            'property_type' => 'Apartment',
        ]);
    }

    public function test_society_selection_autofills_location_and_inherited_amenities(): void
    {
        $society = Society::create([
            'name' => 'Autofill Society',
            'slug' => 'autofill-society',
            'sector' => 'Sector 66',
            'locality' => 'Golf Course Extension Road',
            'city' => 'Gurugram',
            'status' => 'Verified',
            'verification_status' => 'Verified',
            'is_published' => true,
            'amenities' => ['Clubhouse', 'Gymnasium'],
        ]);

        $this->withToken('admin-test-token')
            ->postJson('/api/admin/properties', [
                'listing_type' => 'Sale',
                'property_type' => 'Apartment',
                'society_id' => $society->id,
                'sale_price' => 40000000,
                'area_sqft' => 2000,
                'property_amenities' => ['Modular Kitchen'],
            ])
            ->assertCreated()
            ->assertJsonPath('data.society', 'Autofill Society')
            ->assertJsonPath('data.sector', 'Sector 66')
            ->assertJsonPath('data.locality', 'Golf Course Extension Road')
            ->assertJsonPath('data.price_per_sqft', 20000)
            ->assertJsonPath('data.sale_price_unit', 'total')
            ->assertJsonPath('data.inherited_society_amenities.0', 'Clubhouse')
            ->assertJsonPath('data.property_amenities.0', 'Modular Kitchen');
    }

    public function test_owner_listing_free_text_location_stays_submitted_and_never_publishes_property(): void
    {
        $this->postJson('/api/listings', [
            'name' => 'Owner Free Text',
            'phone' => '9876543210',
            'purpose' => 'rent',
            'listing_type' => 'apartment',
            'locality' => 'Typed Locality',
            'bhk' => '3',
            'rent_amount' => 90000,
        ])
            ->assertCreated()
            ->assertJsonPath('data.status', 'submitted')
            ->assertJsonPath('data.locality', 'Typed Locality');

        $this->assertSame(1, OwnerListing::count());
        $this->assertSame(0, Property::count());
    }

    public function test_public_property_response_hides_owner_and_private_unit_fields(): void
    {
        $society = Society::create([
            'name' => 'Public Property Society',
            'slug' => 'public-property-society',
            'status' => 'Verified',
            'verification_status' => 'Verified',
            'is_published' => true,
            'published_at' => now(),
        ]);

        $response = $this->withToken('admin-test-token')
            ->postJson('/api/admin/properties', [
                'society_id' => $society->id,
                'title' => 'Verified rental home',
                'listing_type' => 'Rent',
                'property_type' => 'Apartment',
                'status' => 'Live',
                'locality' => 'Sector 54',
                'rent_amount' => 85000,
                'security_deposit' => '170000',
                'owner_name' => 'Private Owner',
                'owner_phone' => '9876543210',
                'unit_number' => 'A-1201',
                'verified' => true,
                'images' => ['https://cdn.example.com/properties/verified-home.jpg'],
            ])
            ->assertCreated();

        $this->getJson('/api/properties/'.$response->json('data.slug'))
            ->assertOk()
            ->assertJsonMissingPath('data.owner_name')
            ->assertJsonMissingPath('data.owner_phone')
            ->assertJsonMissingPath('data.owner_account_id')
            ->assertJsonMissingPath('data.broker_account_id')
            ->assertJsonMissingPath('data.owner_listing_id')
            ->assertJsonMissingPath('data.submitted_by_user_id')
            ->assertJsonMissingPath('data.unit_number');
    }

    public function test_publish_remains_blocked_for_unverified_property(): void
    {
        $society = Society::create([
            'name' => 'Publish Block Society',
            'slug' => 'publish-block-society',
            'status' => 'Verified',
            'verification_status' => 'Verified',
            'is_published' => true,
        ]);

        $this->withToken('admin-test-token')
            ->postJson('/api/admin/properties', [
                'society_id' => $society->id,
                'listing_type' => 'Rent',
                'property_type' => 'Apartment',
                'status' => 'Live',
                'rent_amount' => 85000,
                'security_deposit' => '170000',
                'owner_name' => 'Owner',
                'owner_phone' => '9876543210',
                'images' => ['https://cdn.example.com/properties/verified-home.jpg'],
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['verified']);
    }
}
