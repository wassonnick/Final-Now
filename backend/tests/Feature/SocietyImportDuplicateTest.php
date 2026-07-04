<?php

namespace Tests\Feature;

use App\Models\Society;
use App\Models\SocietyImportJob;
use App\Services\SocietyImportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SocietyImportDuplicateTest extends TestCase
{
    use RefreshDatabase;

    private function seedSociety(string $name, string $slug): Society
    {
        return Society::create([
            'name' => $name, 'slug' => $slug, 'builder' => 'DLF Limited',
            'sector' => 'Sector 54', 'locality' => 'Sector 54', 'city' => 'Gurugram', 'state' => 'Haryana',
            'description' => 'Existing verified society.', 'status' => 'Verified',
            'verification_status' => 'Verified', 'is_published' => true, 'score' => 8.5,
        ]);
    }

    public function test_normalize_key_collapses_real_world_variations(): void
    {
        $pairs = [
            ['DLF Crest', 'DLF The Crest'],
            ['M3M Golfestate', 'M3M Golf Estate'],
            ['DLF The Crest', 'DLF The Crest Gurgaon'],
            ['DLF The Crest', 'DLF The Crest Sector 54'],
            ['m3m  golfestate!', 'M3M Golfestate'],
        ];
        foreach ($pairs as [$a, $b]) {
            $this->assertSame(
                SocietyImportService::normalizeNameKey($a),
                SocietyImportService::normalizeNameKey($b),
                "'{$a}' and '{$b}' should share a duplicate key",
            );
        }
    }

    public function test_distinct_societies_do_not_collide(): void
    {
        $this->assertNotSame(
            SocietyImportService::normalizeNameKey('DLF The Crest'),
            SocietyImportService::normalizeNameKey('DLF The Camellias'),
        );
    }

    public function test_bulk_import_skips_fuzzy_duplicate_of_suffixed_slug(): void
    {
        // Stored the way the pipeline actually persists: name is clean, slug carries a
        // sector/city suffix — exactly the case the old exact matcher missed.
        $this->seedSociety('M3M Golfestate', 'm3m-golfestate-sector-65-gurgaon');

        $service = app(SocietyImportService::class);
        $job = SocietyImportJob::create([
            'type' => 'bulk_names', 'source' => 'Bulk Import', 'status' => 'queued',
            'input' => json_encode(['count' => 2]),
            'results' => [
                ['name' => 'M3M Golf Estate', 'location' => 'Sector 65', 'status' => 'pending', 'include_images' => false],
                ['name' => 'M3M Golfestate Gurgaon', 'location' => '', 'status' => 'pending', 'include_images' => false],
            ],
        ]);

        $service->processJobTick($job);
        $job->refresh();

        foreach ($job->results as $row) {
            $this->assertSame('skipped', $row['status'], "Row '{$row['name']}' should be skipped as duplicate");
        }
        // No new societies created — the single seed remains.
        $this->assertSame(1, Society::count());
    }
}
