<?php

namespace Tests\Feature;

use App\Models\SavedSearch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The demand signal that was being thrown away.
 *
 * A brief was only stored if somebody signed in to save it, so the nine most deliberate
 * answers anyone gives this site survived in one browser and died with the tab. These hold
 * the rules that make recording it anonymously safe and useful: nobody is identified, one
 * person editing their mind stays one row, and an empty brief is not demand.
 */
class AnonymousBriefTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $filters = [], string $token = 'tok_anonymous_brief_0001'): array
    {
        return [
            'token' => $token,
            'shortlisted' => 3,
            'scanned' => 322,
            'filters' => array_merge([
                'mode' => 'buy', 'where' => 'Sector 65', 'bhk' => '3',
                'city' => 'Gurgaon', 'notes' => 'Park facing, pet friendly.',
            ], $filters),
        ];
    }

    public function test_a_brief_is_recorded_without_anyone_signing_in(): void
    {
        $this->postJson('/api/briefs', $this->payload())->assertOk()->assertJson(['recorded' => true]);

        $brief = SavedSearch::briefs()->firstOrFail();

        $this->assertNull($brief->account_id, 'an anonymous brief must not be attached to anybody');
        $this->assertSame('Sector 65', $brief->filters['where']);
        $this->assertSame('Park facing, pet friendly.', $brief->filters['notes']);
        $this->assertFalse($brief->alert_enabled, 'there is nowhere to send an alert for an anonymous brief');
    }

    /** One person changing their mind is one brief, not six. */
    public function test_editing_a_brief_updates_the_same_row(): void
    {
        $this->postJson('/api/briefs', $this->payload())->assertOk();
        $this->postJson('/api/briefs', $this->payload(['where' => 'Sohna Road']))->assertOk();

        $this->assertSame(1, SavedSearch::briefs()->count());
        $this->assertSame('Sohna Road', SavedSearch::briefs()->firstOrFail()->filters['where']);
    }

    /** Two people are two briefs. */
    public function test_a_different_browser_is_a_different_brief(): void
    {
        $this->postJson('/api/briefs', $this->payload())->assertOk();
        $this->postJson('/api/briefs', $this->payload([], 'tok_anonymous_brief_0002'))->assertOk();

        $this->assertSame(2, SavedSearch::briefs()->count());
    }

    /** Opening the page is not demand. */
    public function test_an_almost_empty_brief_is_not_recorded(): void
    {
        $this->postJson('/api/briefs', [
            'token' => 'tok_anonymous_brief_0003',
            'filters' => ['mode' => 'rent', 'city' => 'Gurgaon'],
        ])->assertOk()->assertJson(['recorded' => false]);

        $this->assertSame(0, SavedSearch::briefs()->count());
    }

    /** Nothing that could identify a person is accepted, even if it is sent. */
    public function test_contact_details_are_never_stored(): void
    {
        $this->postJson('/api/briefs', $this->payload(['name' => 'Asha', 'phone' => '9899000000', 'email' => 'a@b.com']))
            ->assertOk();

        $filters = SavedSearch::briefs()->firstOrFail()->filters;

        foreach (['name', 'phone', 'email'] as $field) {
            $this->assertArrayNotHasKey($field, $filters, "{$field} must never be stored on a brief");
        }
    }

    /** The report that exists to act on this must see it. */
    public function test_anonymous_briefs_reach_the_demand_gap_report(): void
    {
        foreach (['tok_anonymous_brief_0010', 'tok_anonymous_brief_0011'] as $token) {
            $this->postJson('/api/briefs', $this->payload(['where' => 'Sector 82', 'bhk' => '3', 'budget' => '60000'], $token))->assertOk();
        }

        $gap = app(\App\Services\Demand\DemandGapService::class)->gaps()->firstWhere('area', 'Sector 82');

        $this->assertNotNull($gap, 'anonymous briefs must feed the acquisition list');
        $this->assertSame(2, $gap['requests']);
    }

    /** Alerts go to accounts; an anonymous brief has none and must not break the matcher. */
    public function test_the_alert_matcher_ignores_anonymous_briefs(): void
    {
        $this->postJson('/api/briefs', $this->payload())->assertOk();

        $summary = app(\App\Services\SavedSearchMatcher::class)->run(false);

        $this->assertIsArray($summary);
    }
}
