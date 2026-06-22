<?php

namespace Tests\Feature;

use App\Models\Lead;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SiteVisitFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_proposes_and_visitor_confirms_a_site_visit(): void
    {
        config(['services.admin_api_token' => 'admin-test-token']);

        $lead = Lead::create([
            'name' => 'Visit Customer',
            'phone' => '9999999996',
            'source' => 'property_page',
            'status' => 'Contacted',
            'priority' => 'Hot',
            'society_name' => 'Visit Society',
        ]);
        $slotOne = now()->addDay()->startOfHour();
        $slotTwo = now()->addDays(2)->startOfHour();

        $visit = $this->withToken('admin-test-token')->postJson('/api/admin/site-visits', [
            'lead_id' => $lead->id,
            'proposed_slots' => [$slotOne->toISOString(), $slotTwo->toISOString()],
        ])->assertCreated()->assertJsonPath('data.status', 'proposed')->json('data');

        $this->getJson('/api/site-visits/'.$visit['confirmation_token'])
            ->assertOk()->assertJsonCount(2, 'data.proposed_slots');

        $this->postJson('/api/site-visits/'.$visit['confirmation_token'].'/confirm', [
            'selected_slot' => $slotOne->toISOString(),
        ])->assertOk()->assertJsonPath('data.status', 'confirmed');

        $this->assertDatabaseHas('leads', ['id' => $lead->id, 'status' => 'Site Visit']);

        $this->withToken('admin-test-token')->postJson('/api/admin/site-visits/'.$visit['id'].'/remind')
            ->assertOk();

        $this->assertDatabaseMissing('site_visits', ['id' => $visit['id'], 'reminder_sent_at' => null]);
    }
}
