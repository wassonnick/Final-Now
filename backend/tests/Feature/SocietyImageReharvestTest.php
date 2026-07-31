<?php

namespace Tests\Feature;

use App\Jobs\ReharvestSocietyImages;
use App\Models\ImageReharvestRun;
use App\Models\Society;
use App\Services\Society\Import\SocietyImageScreenService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SocietyImageReharvestTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config([
            'services.admin_api_token' => 'admin-test-token',
            'services.google_places_api_key' => 'places-test-key',
            'services.claude.api_key' => 'claude-test-key',
            'services.claude.image_screen_enabled' => true,
        ]);
    }

    private function society(array $attributes = []): Society
    {
        return Society::create(array_merge([
            'name' => 'DLF Magnolias',
            'slug' => 'dlf-magnolias-'.uniqid(),
            'builder' => 'DLF',
            'sector' => 'Sector 42',
            'city' => 'Gurugram',
            'status' => 'Draft',
            'is_published' => false,
            'image_approved_by_admin' => false,
        ], $attributes));
    }

    /** Places references expire, so a re-harvest must resolve the place again. */
    public function test_reharvest_replaces_stale_candidates_with_freshly_resolved_photos(): void
    {
        $society = $this->society([
            'place_id' => 'place-magnolias',
            'image_candidates' => [['source' => 'google_places', 'photo_reference' => 'expired-ref', 'approved' => true, 'is_cover' => true]],
        ]);

        $this->fakePlaces();
        $this->fakeScreen(SocietyImageScreenService::VERDICT_OK);

        $result = app(\App\Services\Society\Import\SocietyImageReharvestService::class)->reharvest($society);

        $this->assertSame('refreshed', $result['status']);
        $this->assertTrue($result['republished']);

        $refs = array_column($society->fresh()->image_candidates, 'photo_reference');
        $this->assertContains('fresh-ref-wide', $refs);
        $this->assertNotContains('expired-ref', $refs);
        $this->assertSame('fresh-ref-wide', $society->fresh()->image_photo_reference);
    }

    /** The whole point of the screen: a poster with a phone number never becomes a cover. */
    public function test_screen_rejects_images_with_phone_numbers_or_people(): void
    {
        $society = $this->society(['place_id' => 'place-magnolias']);

        $this->fakePlaces();
        $this->fakeScreen(SocietyImageScreenService::VERDICT_REJECTED, ['phone_number', 'overlaid_text']);

        $result = app(\App\Services\Society\Import\SocietyImageReharvestService::class)->reharvest($society);

        $this->assertSame('all_rejected', $result['status']);
        $this->assertGreaterThan(0, $result['rejected']);

        $society->refresh();
        $this->assertFalse((bool) $society->image_approved_by_admin);
        $this->assertSame('screened_all_rejected', $society->image_status);

        foreach ($society->image_candidates as $candidate) {
            $this->assertFalse((bool) $candidate['approved']);
            $this->assertFalse((bool) $candidate['is_cover']);
            $this->assertContains('phone_number', $candidate['screen']['reasons']);
        }
    }

    /**
     * A screen that cannot run must not empty the queue. An outage looked exactly like
     * "every image is bad" otherwise, and would have unpublished good covers wholesale.
     */
    public function test_an_unavailable_screen_leaves_candidates_usable(): void
    {
        $society = $this->society(['place_id' => 'place-magnolias']);
        config(['services.claude.image_screen_enabled' => false]);

        $this->fakePlaces();

        $result = app(\App\Services\Society\Import\SocietyImageReharvestService::class)->reharvest($society);

        $this->assertSame('refreshed', $result['status']);
        $this->assertSame(0, $result['rejected']);
        $this->assertSame(
            SocietyImageScreenService::VERDICT_UNKNOWN,
            $society->fresh()->image_candidates[0]['screen']['verdict'],
        );
    }

    /**
     * The single-society endpoint over HTTP, not just the service behind it. The first
     * cut of this controller called fresh(['id']) — fresh() eager-loads RELATIONS, so
     * Laravel went looking for a relationship named "id" and every call 500'd. The
     * service test passed throughout, because the bug was in the response assembly.
     */
    public function test_single_endpoint_returns_the_refreshed_candidates(): void
    {
        $society = $this->society(['place_id' => 'place-magnolias']);

        $this->fakePlaces();
        $this->fakeScreen(SocietyImageScreenService::VERDICT_OK);

        $response = $this->withToken('admin-test-token')
            ->postJson("/api/admin/societies/{$society->id}/reharvest-images", ['screen' => true, 'republish' => true])
            ->assertOk();

        $this->assertSame('refreshed', $response->json('result.status'));
        $this->assertSame($society->id, $response->json('society.id'));
        $this->assertTrue($response->json('society.image_approved_by_admin'));
        $this->assertNotEmpty($response->json('society.image_candidates'));
    }

    public function test_bulk_queues_one_job_per_society_and_tracks_the_run(): void
    {
        Queue::fake();
        $a = $this->society(['image_approved_by_admin' => false]);
        $b = $this->society(['image_approved_by_admin' => true]);

        $response = $this->withToken('admin-test-token')
            ->postJson('/api/admin/image-reharvest/runs', ['scope' => 'missing_images'])
            ->assertStatus(202);

        Queue::assertPushed(ReharvestSocietyImages::class, 1);
        Queue::assertPushed(ReharvestSocietyImages::class, fn ($job) => $job->societyId === $a->id);

        $run = ImageReharvestRun::find($response->json('run.id'));
        $this->assertSame(1, $run->queued);
        $this->assertFalse($run->isFinished());

        $run->recordResult(['society_id' => $a->id, 'name' => $a->name, 'status' => 'refreshed', 'republished' => true, 'rejected' => 2]);

        $run->refresh();
        $this->assertSame(1, $run->completed);
        $this->assertSame(1, $run->republished);
        $this->assertSame(2, $run->rejected_images);
        $this->assertTrue($run->isFinished());
        $this->assertSame($a->id, $run->results[0]['society_id']);

        $this->assertNotNull($b->id);
    }

    /**
     * A re-harvest refreshes CANDIDATES. If it also reset image_status, a society whose
     * cover an admin had already cleared for publication would silently lose its picture
     * on the public site — approvedSocietyImage() only renders a publishable status.
     */
    public function test_reharvest_never_demotes_an_already_published_cover(): void
    {
        $society = $this->society([
            'place_id' => 'place-magnolias',
            'image_status' => 'developer_permission_received',
            'image_approved_by_admin' => true,
        ]);

        $this->fakePlaces();
        $this->fakeScreen(SocietyImageScreenService::VERDICT_REJECTED, ['people']);

        app(\App\Services\Society\Import\SocietyImageReharvestService::class)->reharvest($society, true, false);

        $this->assertSame('developer_permission_received', $society->fresh()->image_status);
        $this->assertTrue((bool) $society->fresh()->image_approved_by_admin);
    }

    /**
     * "Nothing usable found" named no cause: it read identically whether Google had no
     * match, the photos were too small, or the only URL on file was a broker microsite.
     * Each failure mode must now be distinguishable from the message alone.
     */
    public function test_unmatched_place_is_named_as_the_cause(): void
    {
        Http::fake([
            'maps.googleapis.com/maps/api/place/findplacefromtext/*' => Http::response(['status' => 'ZERO_RESULTS', 'candidates' => []]),
        ]);

        $result = app(\App\Services\Society\Import\SocietyImageReharvestService::class)
            ->reharvest($this->society(['name' => 'Nowhere Heights']));

        $this->assertSame('no_candidates', $result['status']);
        $this->assertStringContainsString('did not match', $result['note']);
    }

    public function test_a_broker_microsite_is_named_as_the_reason_it_was_skipped(): void
    {
        Http::fake([
            'maps.googleapis.com/maps/api/place/findplacefromtext/*' => Http::response(['status' => 'OK', 'candidates' => [['place_id' => 'p2']]]),
            'maps.googleapis.com/maps/api/place/details/*' => Http::response(['status' => 'OK', 'result' => [
                'place_id' => 'p2',
                'name' => 'DLF Magnolias',
                'geometry' => ['location' => ['lat' => 28.4, 'lng' => 77.0]],
                'photos' => [],
            ]]),
        ]);

        $result = app(\App\Services\Society\Import\SocietyImageReharvestService::class)
            ->reharvest($this->society(['official_project_url' => 'https://buy-dlf-magnolias-gurgaon.in/']));

        $this->assertStringContainsString('no photos at all', $result['note']);
        $this->assertStringContainsString("not the builder", $result['note']);
        $this->assertStringContainsString('buy-dlf-magnolias-gurgaon.in', $result['note']);
    }

    private function fakePlaces(): void
    {
        Http::fake([
            'maps.googleapis.com/maps/api/place/findplacefromtext/*' => Http::response([
                'status' => 'OK', 'candidates' => [['place_id' => 'place-magnolias']],
            ]),
            'maps.googleapis.com/maps/api/place/details/*' => Http::response([
                'status' => 'OK',
                'result' => [
                    'place_id' => 'place-magnolias',
                    'name' => 'DLF Magnolias',
                    'formatted_address' => 'Sector 42, Gurugram, Haryana',
                    'geometry' => ['location' => ['lat' => 28.45, 'lng' => 77.09]],
                    'photos' => [
                        ['photo_reference' => 'fresh-ref-wide', 'width' => 1600, 'height' => 1000],
                        ['photo_reference' => 'fresh-ref-tall', 'width' => 900, 'height' => 1600],
                    ],
                ],
            ]),
            'maps.googleapis.com/maps/api/place/photo*' => Http::response('binary-jpeg', 200, ['Content-Type' => 'image/jpeg']),
        ]);
    }

    /**
     * The Anthropic SDK does not run through Laravel's HTTP client, so the vision call
     * is stubbed at the service boundary. What the model actually replies is parsed by
     * SocietyImageScreenService::parse(), covered directly in the test below.
     */
    private function fakeScreen(string $verdict, array $reasons = []): void
    {
        $this->app->instance(SocietyImageScreenService::class, new class($verdict, $reasons) extends SocietyImageScreenService
        {
            public function __construct(private readonly string $verdict, private readonly array $reasons)
            {
            }

            public function enabled(): bool
            {
                return true;
            }

            public function screen(array $candidate, string $societyName = ''): array
            {
                return ['verdict' => $this->verdict, 'reasons' => $this->reasons, 'note' => null, 'at' => now()->toIso8601String()];
            }
        });
    }

    /** The two-line contract the prompt asks for, and what happens when it is not met. */
    public function test_screen_reply_parsing(): void
    {
        $parse = function (string $reply) {
            $method = new \ReflectionMethod(SocietyImageScreenService::class, 'parse');
            $method->setAccessible(true);

            return $method->invoke(app(SocietyImageScreenService::class), $reply);
        };

        $ok = $parse("VERDICT: OK\nREASONS: none");
        $this->assertSame(SocietyImageScreenService::VERDICT_OK, $ok['verdict']);
        $this->assertSame([], $ok['reasons']);

        $bad = $parse("VERDICT: REJECT\nREASONS: phone_number, People , overlaid_text");
        $this->assertSame(SocietyImageScreenService::VERDICT_REJECTED, $bad['verdict']);
        $this->assertSame(['phone_number', 'people', 'overlaid_text'], $bad['reasons']);

        // A garbled reply must not be read as a rejection.
        $this->assertSame(SocietyImageScreenService::VERDICT_UNKNOWN, $parse('I cannot help with that.')['verdict']);
    }
}
