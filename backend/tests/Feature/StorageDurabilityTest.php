<?php
namespace Tests\Feature;
use App\Models\Society;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class StorageDurabilityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.admin_api_token' => 'admin-test-token']);
    }

    /**
     * The silent failure: a local disk on a container platform loses every upload on the
     * next deploy, and nothing anywhere errors. It has to be stated outright.
     */
    public function test_a_local_uploads_disk_is_reported_as_ephemeral(): void
    {
        config(['filesystems.uploads_disk' => 'public']);
        Storage::fake('public');

        $response = $this->withToken('admin-test-token')->getJson('/api/admin/diagnostics/storage')->assertOk();

        $this->assertSame('local', $response->json('driver'));
        $this->assertFalse($response->json('durable'));
        $this->assertStringContainsString('EPHEMERAL', $response->json('verdict'));
        $this->assertTrue($response->json('round_trip.read_back'));
        // The way out must be named, not left as an exercise.
        $this->assertContains('r2', $response->json('configured_alternatives'));
    }

    /** Covers whose files have vanished are counted, because that is the visible symptom. */
    public function test_missing_stored_covers_are_counted(): void
    {
        config(['filesystems.uploads_disk' => 'public']);
        Storage::fake('public');
        Storage::disk('public')->put('societies/present.jpg', 'bytes');

        Society::create(['name' => 'Has image', 'slug' => 'a-'.uniqid(), 'cover_image' => 'https://x.test/storage/societies/present.jpg']);
        Society::create(['name' => 'Lost image', 'slug' => 'b-'.uniqid(), 'cover_image' => 'https://x.test/storage/societies/gone.jpg']);
        // A remote URL is a different problem and must not be counted as a lost file.
        Society::create(['name' => 'Remote', 'slug' => 'c-'.uniqid(), 'cover_image' => 'https://www.dlf.in/hero.jpg']);

        $response = $this->withToken('admin-test-token')->getJson('/api/admin/diagnostics/storage')->assertOk();

        $this->assertSame(2, $response->json('stored_covers.checked'));
        $this->assertSame(1, $response->json('stored_covers.missing_from_disk'));
        $this->assertSame('Lost image', $response->json('stored_covers.examples.0.name'));
    }

    public function test_an_s3_disk_is_reported_as_durable(): void
    {
        config(['filesystems.uploads_disk' => 'r2', 'filesystems.disks.r2.driver' => 's3']);
        Storage::fake('r2');

        $response = $this->withToken('admin-test-token')->getJson('/api/admin/diagnostics/storage')->assertOk();
        $this->assertTrue($response->json('durable'));
    }
}
