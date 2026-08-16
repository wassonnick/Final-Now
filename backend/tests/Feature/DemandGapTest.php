<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Lead;
use App\Models\Property;
use App\Models\SavedSearch;
use App\Models\Society;
use App\Services\Demand\DemandGapService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The acquisition list, and the rules that keep it worth acting on.
 *
 * Two live listings against 526 published societies is the constraint every feature has
 * been working around. This turns captured intent into the one output that addresses it —
 * which flats to go and sign — so the ordering has to put "nobody could be served" above
 * everything else, and a bucket we can already fill must not appear at all.
 */
class DemandGapTest extends TestCase
{
    use RefreshDatabase;

    private int $asker = 0;

    private function account(): Account
    {
        // A distinct person per brief: the report counts requests, so reusing one account
        // would quietly measure something else.
        $phone = '98000'.str_pad((string) ++$this->asker, 5, '0', STR_PAD_LEFT);

        return Account::create([
            'role' => 'customer', 'phone' => $phone, 'phone_normalized' => $phone,
            'name' => 'Asker '.$this->asker, 'status' => 'active',
        ]);
    }

    private function brief(array $filters, ?Account $account = null): SavedSearch
    {
        return SavedSearch::create([
            'account_id' => ($account ?: $this->account())->id,
            'name' => 'A brief',
            'filters' => array_merge(['kind' => 'brief', 'mode' => 'rent'], $filters),
            'alert_enabled' => false, 'alert_channel' => 'whatsapp', 'alert_frequency' => 'daily',
        ]);
    }

    private function society(string $name, string $locality): Society
    {
        return Society::create([
            'name' => $name, 'slug' => str($name)->slug()->value(), 'locality' => $locality,
            'city' => 'Gurugram', 'status' => 'Verified', 'is_published' => true,
        ]);
    }

    private function listing(Society $society, array $over = []): Property
    {
        return Property::create(array_merge([
            'society_id' => $society->id, 'title' => 'A home', 'slug' => 'a-home-'.uniqid(),
            'listing_type' => 'Rent', 'status' => 'Live', 'verified' => true, 'verified_at' => now(),
            'availability_checked_at' => now(), 'published_at' => now(),
            'locality' => $society->locality, 'society' => $society->name, 'bedrooms' => '3',
        ], $over));
    }

    private function service(): DemandGapService
    {
        return app(DemandGapService::class);
    }

    public function test_it_groups_repeated_requirements_and_counts_them(): void
    {
        foreach (range(1, 3) as $i) {
            $this->brief(['where' => 'Golf Course Extension', 'bhk' => '3', 'budget' => '60000']);
        }

        $gap = $this->service()->gaps()->firstWhere('area', 'Golf Course Extension');

        $this->assertSame(3, $gap['requests']);
        $this->assertSame(3, $gap['bhk']);
        $this->assertSame(60000, $gap['typical_budget']);
    }

    /** One person asking is not a pattern to call an owner about. */
    public function test_a_single_request_is_not_reported_as_a_pattern(): void
    {
        $this->brief(['where' => 'Somewhere Quiet', 'bhk' => '2']);

        $this->assertNull($this->service()->gaps()->firstWhere('area', 'Somewhere Quiet'));
    }

    /** The whole point: demand nobody could be sent to comes first. */
    public function test_unmet_demand_outranks_larger_demand_we_can_already_serve(): void
    {
        $served = $this->society('Served Heights', 'Sector 65');
        $this->listing($served);
        $this->listing($served);

        foreach (range(1, 5) as $i) {
            $this->brief(['where' => 'Sector 65', 'bhk' => '3', 'budget' => '60000']);
        }
        foreach (range(1, 2) as $i) {
            $this->brief(['where' => 'Sector 99', 'bhk' => '3', 'budget' => '55000']);
        }

        $gaps = $this->service()->gaps();

        $this->assertSame('Sector 99', $gaps->first()['area']);
        $this->assertTrue($gaps->first()['unmet']);
        $this->assertFalse($gaps->firstWhere('area', 'Sector 65')['unmet']);
    }

    /** A listing of the wrong size or the wrong mode does not count as serving anyone. */
    public function test_supply_only_counts_when_it_actually_matches(): void
    {
        $society = $this->society('Wrong Fit', 'Sector 70');
        $this->listing($society, ['bedrooms' => '1']);
        $this->listing($society, ['listing_type' => 'Sale', 'bedrooms' => '3']);

        foreach (range(1, 2) as $i) {
            $this->brief(['where' => 'Sector 70', 'bhk' => '3']);
        }

        $gap = $this->service()->gaps()->firstWhere('area', 'Sector 70');

        $this->assertTrue($gap['unmet'], 'a 1 BHK rental and a 3 BHK sale should not answer a 3 BHK rental');
        $this->assertSame(1, $gap['societies_known']);
    }

    /** Leads carry requirements in prose, and are the only record of some of them. */
    public function test_it_reads_requirements_out_of_leads_too(): void
    {
        foreach (range(1, 2) as $i) {
            Lead::create([
                'name' => 'Caller '.$i, 'phone' => '99000000'.$i, 'status' => 'New',
                'target_locality' => 'Sohna Road', 'lead_intent' => 'rent', 'budget' => '45k',
                'requirement' => 'Looking for a 2 BHK with parking, no ground floor.',
            ]);
        }

        $gap = $this->service()->gaps()->firstWhere('area', 'Sohna Road');

        $this->assertSame(2, $gap['requests']);
        $this->assertSame(2, $gap['bhk']);
        $this->assertSame(45000, $gap['typical_budget']);
        $this->assertNotEmpty($gap['notes']);
    }

    /** Briefs and leads for the same thing are one gap, not two. */
    public function test_a_brief_and_a_lead_for_the_same_thing_are_counted_together(): void
    {
        $this->brief(['where' => 'Sector 82', 'bhk' => '3', 'budget' => '50000']);
        Lead::create([
            'name' => 'Caller', 'phone' => '9900000009', 'status' => 'New',
            'target_locality' => 'Sector 82', 'lead_intent' => 'rent', 'budget' => '50000',
            'requirement' => '3 BHK needed',
        ]);

        $gap = $this->service()->gaps()->firstWhere('area', 'Sector 82');

        $this->assertSame(2, $gap['requests']);
        $this->assertSame(['brief' => 1, 'lead' => 1], $gap['sources']);
    }

    /** A request with no stated area cannot be turned into a call, so it is left out. */
    public function test_requests_without_an_area_are_not_reported(): void
    {
        foreach (range(1, 3) as $i) {
            $this->brief(['where' => '', 'commute' => '', 'city' => '', 'bhk' => '2']);
        }

        $this->assertTrue($this->service()->gaps()->every(fn ($row) => $row['area'] !== ''));
    }

    /** The median is what to quote an owner; one outlier must not move it. */
    public function test_the_typical_budget_ignores_an_outlier(): void
    {
        foreach ([40000, 42000, 44000, 900000] as $budget) {
            $this->brief(['where' => 'Sector 50', 'bhk' => '2', 'budget' => (string) $budget]);
        }

        $gap = $this->service()->gaps()->firstWhere('area', 'Sector 50');

        $this->assertSame(43000, $gap['typical_budget']);
        $this->assertSame([40000, 900000], $gap['budget_range']);
    }
}
