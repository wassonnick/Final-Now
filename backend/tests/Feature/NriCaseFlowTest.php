<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NriCaseFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
    }

    public function test_nri_intake_requires_consent_and_valid_preferred_contact(): void
    {
        $base = [
            'name' => 'Overseas Owner', 'country' => 'United Kingdom',
            'contact_method' => 'email', 'service_type' => 'manage',
        ];

        $this->postJson('/api/nri-cases', $base)->assertStatus(422);
        $this->postJson('/api/nri-cases', $base + ['consent' => true])->assertStatus(422);

        $this->postJson('/api/nri-cases', [
            ...$base, 'contact_method' => 'whatsapp', 'phone' => '123', 'consent' => true,
        ])->assertStatus(422);
    }

    public function test_valid_nri_request_creates_private_admin_case(): void
    {
        $response = $this->postJson('/api/nri-cases', [
            'name' => 'Overseas Owner',
            'country' => 'United Kingdom',
            'contact_method' => 'email',
            'email' => 'owner@example.com',
            'service_type' => 'rent_out',
            'property_context' => 'Apartment in Sector 54, Gurugram',
            'notes' => 'Need help coordinating local verification.',
            'consent' => true,
        ])->assertCreated()
            ->assertJsonPath('case_reference', 'NRI-1')
            ->assertJsonMissingPath('data.email');

        $this->assertDatabaseHas('nri_cases', [
            'email' => 'owner@example.com', 'status' => 'submitted', 'service_type' => 'rent_out',
        ]);

        $this->getJson('/api/nri-cases')->assertStatus(405);

        $this->withToken('admin-test-token')->getJson('/api/admin/nri-cases')
            ->assertOk()
            ->assertJsonPath('data.data.0.email', 'owner@example.com');

        $caseId = 1;
        $this->withToken('admin-test-token')->patchJson('/api/admin/nri-cases/'.$caseId, [
            'status' => 'contacted', 'assigned_to' => 'NRI Desk', 'admin_notes' => 'Contact consent confirmed.',
        ])->assertOk()->assertJsonPath('data.status', 'contacted');
    }
}
