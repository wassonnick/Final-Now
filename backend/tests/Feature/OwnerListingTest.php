<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\OwnerListing;
use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class OwnerListingTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
    }

    public function test_anyone_can_submit_a_listing_with_images_and_a_lead_is_created(): void
    {
        $society = Society::create(['name' => 'Intake Society', 'slug' => 'intake-society', 'sector' => 'Sector 65', 'status' => 'Verified', 'verification_status' => 'Verified', 'is_published' => true, 'score' => 8]);

        $response = $this->postJson('/api/listings', [
            'name' => 'Owner One', 'phone' => '9876543210', 'purpose' => 'rent', 'listing_type' => 'apartment',
            'society_id' => $society->id, 'bhk' => '3', 'size_sqft' => '1850', 'floor' => '12',
            'furnishing' => 'Semi-furnished', 'expected_price' => '₹85,000',
            'images' => ['https://final-now.onrender.com/storage/listings/2026/07/a.jpg', 'https://evil.example/x.jpg'],
        ]);

        $response->assertCreated()->assertJsonPath('data.status', 'submitted')->assertJsonPath('data.society_name', 'Intake Society');
        $listing = OwnerListing::firstOrFail();
        // Foreign image URLs are dropped; only our own storage URLs are kept.
        $this->assertSame(['https://final-now.onrender.com/storage/listings/2026/07/a.jpg'], $listing->images);
        // The ops workflow still gets a lead.
        $this->assertDatabaseHas('leads', ['phone' => '9876543210', 'source' => 'owner_listing_rent']);
    }

    public function test_registered_phone_is_attached_to_account_instead_of_blocked(): void
    {
        $account = Account::create(['name' => 'Existing', 'phone' => '9876543210', 'phone_normalized' => '9876543210', 'role' => 'customer']);

        $this->postJson('/api/listings', [
            'name' => 'Existing',
            'phone' => '9876543210',
            'purpose' => 'sale',
            'listing_type' => 'builder_floor',
            'sector' => 'Sector 57',
            'sale_price' => 25000000,
        ])
            ->assertCreated();

        $this->assertSame($account->id, OwnerListing::firstOrFail()->account_id);
    }

    public function test_image_upload_stores_and_returns_public_url(): void
    {
        Storage::fake('public');

        $this->postJson('/api/listings/images', ['image' => UploadedFile::fake()->image('flat.jpg', 1200, 900)])
            ->assertCreated()
            ->assertJsonStructure(['data' => ['path', 'url']]);

        $this->postJson('/api/listings/images', ['image' => UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf')])
            ->assertUnprocessable();
    }

    public function test_account_can_track_their_listings(): void
    {
        $account = Account::create(['name' => 'Tracker', 'phone' => '9812345678', 'phone_normalized' => '9812345678', 'role' => 'customer', 'api_token_hash' => hash('sha256', str_repeat('t', 48))]);
        OwnerListing::create(['account_id' => $account->id, 'name' => 'Tracker', 'phone' => '9812345678', 'purpose' => 'rent', 'listing_type' => 'apartment', 'status' => 'under_review']);

        $this->getJson('/api/accounts/listings')->assertUnauthorized();
        $this->withHeaders(['Authorization' => 'Bearer '.str_repeat('t', 48)])
            ->getJson('/api/accounts/listings')
            ->assertOk()->assertJsonPath('data.0.status', 'under_review');
    }

    public function test_admin_can_convert_a_listing_into_an_unpublished_property_draft(): void
    {
        $society = Society::create(['name' => 'Convert Society', 'slug' => 'convert-society', 'sector' => 'Sector 70', 'status' => 'Verified', 'verification_status' => 'Verified', 'is_published' => true, 'score' => 8]);
        $listing = OwnerListing::create([
            'name' => 'Owner Two', 'phone' => '9876500000', 'purpose' => 'sale', 'listing_type' => 'builder_floor',
            'society_id' => $society->id, 'society_name' => 'Convert Society', 'bhk' => '4', 'size_sqft' => '2400 sq ft',
            'expected_price' => '₹3.2 Cr', 'images' => ['https://final-now.onrender.com/storage/listings/2026/07/b.jpg'],
        ]);

        $this->postJson("/api/admin/owner-listings/{$listing->id}/convert")->assertUnauthorized();

        $this->withHeaders(['Authorization' => 'Bearer admin-test-token'])
            ->postJson("/api/admin/owner-listings/{$listing->id}/convert")
            ->assertCreated();

        $fresh = $listing->fresh();
        $this->assertSame('converted', $fresh->status);
        $this->assertDatabaseHas('properties', [
            'id' => $fresh->property_id,
            'listing_type' => 'Builder Floor',
            'status' => 'Draft',
            'verified' => false,
            'society_id' => $society->id,
            'bedrooms' => 4,
            'area_sqft' => 2400,
            'source_type' => 'owner_submitted_listing',
            'inventory_owner_type' => 'owner',
            'owner_listing_id' => $listing->id,
        ]);

        // Converting twice fails cleanly.
        $this->withHeaders(['Authorization' => 'Bearer admin-test-token'])
            ->postJson("/api/admin/owner-listings/{$listing->id}/convert")
            ->assertUnprocessable();
    }
}
