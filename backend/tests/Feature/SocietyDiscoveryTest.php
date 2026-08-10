<?php

namespace Tests\Feature;

use App\Models\Society;
use App\Models\SocietyImportCandidate;
use App\Models\SocietyImportJob;
use App\Services\Society\Import\SocietyDiscoveryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

class SocietyDiscoveryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.google_places_api_key' => 'test-key']);
    }

    /** @param array<int,array<string,mixed>> $places */
    private function fakePlaces(array $places): void
    {
        Http::fake([
            'places.googleapis.com/v1/places:searchText' => Http::response(['places' => $places], 200),
        ]);
    }

    private function place(string $id, string $name, array $types = ['premise'], int $ratings = 12): array
    {
        return [
            'id' => $id,
            'displayName' => ['text' => $name],
            'formattedAddress' => $name.', Sector 65, Gurugram',
            'location' => ['latitude' => 28.4, 'longitude' => 77.0],
            'types' => $types,
            'userRatingCount' => $ratings,
        ];
    }

    private function society(string $name, ?string $placeId = null): Society
    {
        return Society::create([
            'name' => $name,
            'slug' => Str::slug($name).'-'.uniqid(),
            'place_id' => $placeId,
            'city' => 'Gurugram',
            'status' => 'Verified',
            'is_published' => true,
        ]);
    }

    public function test_a_society_we_do_not_have_is_recorded_as_a_gap(): void
    {
        $this->fakePlaces([$this->place('place-a', 'Emaar Palm Gardens')]);

        $result = app(SocietyDiscoveryService::class)->scan('Sector 65 Gurgaon');

        $this->assertSame(1, $result['new']);
        $candidate = SocietyImportCandidate::where('place_id', 'place-a')->firstOrFail();
        $this->assertSame(SocietyImportCandidate::STATUS_NEW, $candidate->status);
        $this->assertSame('Emaar Palm Gardens', $candidate->name);
    }

    /** Google's own id for the site — no rename can make it a different building. */
    public function test_a_society_matched_by_place_id_is_not_a_gap(): void
    {
        $this->society('Completely Different Name', 'place-a');
        $this->fakePlaces([$this->place('place-a', 'Emaar Palm Gardens')]);

        $result = app(SocietyDiscoveryService::class)->scan('Sector 65 Gurgaon');

        $this->assertSame(0, $result['new']);
        $this->assertSame(1, $result['known']);
    }

    /** The failure that makes a discovery queue useless: reporting what we already hold. */
    public function test_spelling_variants_of_a_society_we_hold_are_not_reported_as_gaps(): void
    {
        $this->society('DLF Belvedere Park');
        $this->fakePlaces([
            $this->place('place-a', 'DLF Belvedere Park Apartments'),
            $this->place('place-b', 'dlf belvedere park society'),
        ]);

        $result = app(SocietyDiscoveryService::class)->scan('Sector 24 Gurgaon');

        $this->assertSame(0, $result['new'], 'Both are the society we already have.');
        $this->assertSame(2, $result['known']);
    }

    /** An uncertain match is neither hidden nor claimed — it goes to a person. */
    public function test_a_partial_name_match_is_surfaced_as_a_likely_duplicate(): void
    {
        $existing = $this->society('DLF The Crest');
        $this->fakePlaces([$this->place('place-a', 'The Crest')]);

        $result = app(SocietyDiscoveryService::class)->scan('Sector 54 Gurgaon');

        $this->assertSame(1, $result['likely_duplicate']);
        $candidate = SocietyImportCandidate::where('place_id', 'place-a')->firstOrFail();
        $this->assertSame(SocietyImportCandidate::STATUS_LIKELY_DUPLICATE, $candidate->status);
        $this->assertSame($existing->id, $candidate->society_id);
        $this->assertStringContainsString('DLF The Crest', (string) $candidate->status_reason);
    }

    public function test_brokers_hotels_and_shops_are_filtered_out(): void
    {
        $this->fakePlaces([
            $this->place('place-a', 'Sharma Property Dealer'),
            $this->place('place-b', 'Hotel Bristol', ['lodging']),
            $this->place('place-c', 'Gupta Real Estate Consultant'),
            $this->place('place-d', 'Ireo Victory Valley'),
        ]);

        $result = app(SocietyDiscoveryService::class)->scan('Sector 67 Gurgaon');

        $this->assertSame(3, $result['rejected']);
        $this->assertSame(1, $result['new']);
        $this->assertSame('Ireo Victory Valley', SocietyImportCandidate::where('status', 'new')->value('name'));
    }

    /** A dismissal is a decision about the place, not about one scan. */
    public function test_a_dismissed_candidate_is_not_resurrected_by_a_later_scan(): void
    {
        $this->fakePlaces([$this->place('place-a', 'Vipul Gardens')]);
        app(SocietyDiscoveryService::class)->scan('Sector 65 Gurgaon');

        SocietyImportCandidate::where('place_id', 'place-a')
            ->update(['status' => SocietyImportCandidate::STATUS_DISMISSED, 'status_reason' => 'Not a society']);

        app(SocietyDiscoveryService::class)->scan('Sector 65 Gurgaon');

        $candidate = SocietyImportCandidate::where('place_id', 'place-a')->firstOrFail();
        $this->assertSame(SocietyImportCandidate::STATUS_DISMISSED, $candidate->status);
        $this->assertSame('Not a society', $candidate->status_reason);
    }

    /** Rescanning must update the record, never duplicate it. */
    public function test_rescanning_keeps_one_row_and_tracks_when_it_was_first_seen(): void
    {
        $this->fakePlaces([$this->place('place-a', 'Emaar Palm Gardens')]);

        app(SocietyDiscoveryService::class)->scan('Sector 65 Gurgaon');
        $first = SocietyImportCandidate::where('place_id', 'place-a')->firstOrFail()->first_seen_at;

        app(SocietyDiscoveryService::class)->scan('Sector 65 Gurgaon');

        $this->assertSame(1, SocietyImportCandidate::where('place_id', 'place-a')->count());
        $this->assertEquals($first, SocietyImportCandidate::where('place_id', 'place-a')->firstOrFail()->first_seen_at);
    }

    /** A failed search must record nothing rather than report an empty market. */
    public function test_a_failed_search_records_nothing(): void
    {
        Http::fake(['places.googleapis.com/*' => Http::response('denied', 403)]);

        $result = app(SocietyDiscoveryService::class)->scan('Sector 65 Gurgaon');

        $this->assertSame('error', $result['status']);
        $this->assertSame(0, SocietyImportCandidate::count());
    }

    public function test_the_name_normaliser_strips_wrappers_but_keeps_identity(): void
    {
        $this->assertSame('dlf belvedere park', SocietyImportCandidate::normalise('DLF Belvedere Park Apartments'));
        $this->assertSame('dlf belvedere park', SocietyImportCandidate::normalise('dlf belvedere park housing society'));
        $this->assertSame('apartment heights', SocietyImportCandidate::normalise('Apartment Heights'), 'A leading wrapper word is part of the name.');
        $this->assertSame('m3m escala', SocietyImportCandidate::normalise('M3M Escala'));
    }

    public function test_the_queue_shows_only_candidates_still_needing_a_decision(): void
    {
        config(['services.admin_api_token' => 'admin-test-token']);

        $this->fakePlaces([
            $this->place('place-a', 'Emaar Palm Gardens'),
            $this->place('place-b', 'Ireo Victory Valley'),
        ]);
        app(SocietyDiscoveryService::class)->scan('Sector 65 Gurgaon');

        SocietyImportCandidate::where('place_id', 'place-b')->update(['status' => SocietyImportCandidate::STATUS_DISMISSED]);

        $names = collect($this->withToken('admin-test-token')
            ->getJson('/api/admin/discovery/candidates')
            ->assertSuccessful()
            ->json('candidates'))->pluck('name');

        $this->assertSame(['Emaar Palm Gardens'], $names->all());
    }

    /** Importing must go through the one importer, not a second path that drifts from it. */
    public function test_importing_a_candidate_queues_a_normal_import_job(): void
    {
        config(['services.admin_api_token' => 'admin-test-token']);

        $this->fakePlaces([$this->place('place-a', 'Emaar Palm Gardens')]);
        app(SocietyDiscoveryService::class)->scan('Sector 65 Gurgaon');
        $candidate = SocietyImportCandidate::firstOrFail();

        $this->withToken('admin-test-token')
            ->postJson("/api/admin/discovery/candidates/{$candidate->id}/import")
            ->assertSuccessful();

        $job = SocietyImportJob::latest('id')->firstOrFail();
        $this->assertSame('single', $job->type);
        $this->assertSame('Discovery', $job->source);
        $this->assertSame('Emaar Palm Gardens', json_decode((string) $job->input, true)['name']);
        $this->assertSame(SocietyImportCandidate::STATUS_IMPORTED, $candidate->fresh()->status);
    }

    public function test_a_dismissal_can_be_undone(): void
    {
        config(['services.admin_api_token' => 'admin-test-token']);

        $this->fakePlaces([$this->place('place-a', 'Emaar Palm Gardens')]);
        app(SocietyDiscoveryService::class)->scan('Sector 65 Gurgaon');
        $candidate = SocietyImportCandidate::firstOrFail();

        $this->withToken('admin-test-token')
            ->postJson("/api/admin/discovery/candidates/{$candidate->id}/dismiss", ['reason' => 'Broker office'])
            ->assertSuccessful();
        $this->assertSame(SocietyImportCandidate::STATUS_DISMISSED, $candidate->fresh()->status);

        $this->withToken('admin-test-token')
            ->postJson("/api/admin/discovery/candidates/{$candidate->id}/restore")
            ->assertSuccessful();
        $this->assertSame(SocietyImportCandidate::STATUS_NEW, $candidate->fresh()->status);
    }
}
