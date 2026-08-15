<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Property;
use App\Models\SavedSearch;
use App\Models\Society;
use App\Services\SavedSearchMatcher;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * A saved brief must only alert about homes that answer it.
 *
 * The brief builder writes its own filter keys — mode, where, bhk, budget, city — and the
 * matcher only read tab, q and bedrooms. None of them lined up, so every filter was
 * skipped and the query became "all published inventory": a Delhi renter on a ₹40k brief
 * would have been messaged about a ₹5 Cr sale in Gurgaon, under copy promising we would
 * write when something matching came up.
 */
class SavedBriefAlertsTest extends TestCase
{
    use RefreshDatabase;

    private function account(): Account
    {
        $token = str_repeat('b', 48);

        return tap(Account::create([
            'role' => 'customer', 'phone' => '9811111111', 'phone_normalized' => '9811111111',
            'name' => 'Brief User', 'status' => 'active', 'api_token_hash' => hash('sha256', $token),
        ]), fn ($account) => $this->sessionFor($account, $token));
    }

    private function society(string $name, string $city): Society
    {
        return Society::create([
            'name' => $name, 'slug' => str($name)->slug()->value(), 'city' => $city,
            'status' => 'Verified', 'is_published' => true,
        ]);
    }

    private function listing(Society $society, array $attributes): Property
    {
        return Property::create(array_merge([
            'society_id' => $society->id,
            'slug' => str($attributes['title'])->slug()->value(),
            'status' => 'Live', 'verified' => true, 'verified_at' => now(),
            'availability_checked_at' => now(), 'published_at' => now(),
            'city' => $society->city,
        ], $attributes));
    }

    private function brief(Account $account, array $filters): SavedSearch
    {
        return SavedSearch::create([
            'account_id' => $account->id, 'name' => 'My brief',
            'filters' => array_merge(['kind' => 'brief'], $filters),
            'alert_enabled' => true, 'alert_channel' => 'whatsapp', 'alert_frequency' => 'daily',
        ]);
    }

    public function test_a_brief_only_alerts_on_homes_that_match_it(): void
    {
        $account = $this->account();
        $delhi = $this->society('Delhi Green', 'Delhi');
        $gurgaon = $this->society('Gurgaon Heights', 'Gurugram');

        $wanted = $this->listing($delhi, ['title' => 'Right home', 'listing_type' => 'Rent', 'bedrooms' => '2', 'rent_amount' => 35000]);
        $this->listing($gurgaon, ['title' => 'Wrong city', 'listing_type' => 'Rent', 'bedrooms' => '2', 'rent_amount' => 30000]);
        $this->listing($delhi, ['title' => 'Too expensive', 'listing_type' => 'Rent', 'bedrooms' => '2', 'rent_amount' => 90000]);
        $this->listing($delhi, ['title' => 'Too big', 'listing_type' => 'Rent', 'bedrooms' => '4', 'rent_amount' => 35000]);
        $this->listing($delhi, ['title' => 'For sale not rent', 'listing_type' => 'Sale', 'bedrooms' => '2', 'sale_price' => 9000000]);

        $this->brief($account, ['mode' => 'rent', 'city' => 'Delhi', 'bhk' => '2', 'budget' => '40000']);

        $summary = app(SavedSearchMatcher::class)->run(false);

        $this->assertSame(1, $summary['matches_created']);
        $this->assertDatabaseHas('saved_search_alerts', ['property_id' => $wanted->id]);
    }

    /** Gurgaon and Gurugram are one city, whichever spelling a row happens to carry. */
    public function test_a_gurgaon_brief_matches_gurugram_inventory(): void
    {
        $account = $this->account();
        $society = $this->society('Gurgaon Heights', 'Gurugram');
        $this->listing($society, ['title' => 'Gurugram home', 'listing_type' => 'Rent', 'bedrooms' => '3', 'rent_amount' => 50000]);

        $this->brief($account, ['mode' => 'rent', 'city' => 'Gurgaon', 'bhk' => '3', 'budget' => '60000']);

        $this->assertSame(1, app(SavedSearchMatcher::class)->run(false)['matches_created']);
    }

    /** Missing data is not an expensive home, so a listing without a price is still shown. */
    public function test_a_listing_without_a_price_is_not_excluded_by_budget(): void
    {
        $account = $this->account();
        $society = $this->society('Delhi Green', 'Delhi');
        $this->listing($society, ['title' => 'Price on request', 'listing_type' => 'Rent', 'bedrooms' => '2']);

        $this->brief($account, ['mode' => 'rent', 'city' => 'Delhi', 'bhk' => '2', 'budget' => '40000']);

        $this->assertSame(1, app(SavedSearchMatcher::class)->run(false)['matches_created']);
    }

    /**
     * The guard that matters beyond this bug: a filter set we cannot read must alert
     * about nothing, rather than falling through to the whole catalogue.
     */
    public function test_an_unreadable_filter_set_alerts_about_nothing(): void
    {
        $account = $this->account();
        $society = $this->society('Delhi Green', 'Delhi');
        $this->listing($society, ['title' => 'Some home', 'listing_type' => 'Rent', 'bedrooms' => '2', 'rent_amount' => 30000]);

        SavedSearch::create([
            'account_id' => $account->id, 'name' => 'From a future version',
            'filters' => ['something_we_do_not_understand' => 'yet'],
            'alert_enabled' => true, 'alert_channel' => 'whatsapp', 'alert_frequency' => 'daily',
        ]);

        $summary = app(SavedSearchMatcher::class)->run(false);

        $this->assertSame(0, $summary['matches_created']);
        $this->assertSame(1, $summary['unmatchable']);
        $this->assertDatabaseCount('saved_search_alerts', 0);
    }
}
