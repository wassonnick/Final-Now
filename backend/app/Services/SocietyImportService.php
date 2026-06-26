<?php

namespace App\Services;

use App\Models\Society;
use App\Models\SocietyImportJob;
use App\Services\Society\Import\SocietyImportPipeline;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

/**
 * Job lifecycle for the society importer: queueing ticks, deduping, time-budgeted
 * bulk processing and persistence. All per-society research/assembly is delegated
 * to SocietyImportPipeline. Imports only ever create unpublished Draft societies.
 */
class SocietyImportService
{
    // Per poll-tick wall-clock budget for bulk jobs, kept under the 120s job lock.
    private const TICK_BUDGET_SECONDS = 14;

    public function __construct(private SocietyImportPipeline $pipeline) {}

    public function processJobTick(SocietyImportJob $job): SocietyImportJob
    {
        $lock = Cache::lock('society-import-job-'.$job->id, 120);
        if (! $lock->get()) {
            return $job->refresh();
        }

        try {
            return $this->processJobTickUnlocked($job);
        } finally {
            $lock->release();
        }
    }

    private function processJobTickUnlocked(SocietyImportJob $job): SocietyImportJob
    {
        $job->refresh();

        if (in_array($job->status, ['completed', 'failed', 'skipped'], true)) {
            return $job;
        }

        if ($job->status === 'queued') {
            $job->update(['status' => 'running']);
            $this->log($job, 'Job started.');
            $job->refresh();
        }

        return match ($job->type) {
            'single' => $this->processSingle($job),
            'bulk_names', 'bulk_spreadsheet' => $this->processBulkList($job),
            default => $this->failJob($job, 'Unknown import job type: '.$job->type),
        };
    }

    private function processSingle(SocietyImportJob $job): SocietyImportJob
    {
        if (! empty($job->results)) {
            return $job;
        }

        $payload = $this->decode($job->input);
        $name = trim((string) ($payload['name'] ?? ''));

        $result = $this->importOne([
            'name' => $name,
            'location' => $payload['location'] ?? null,
            'url' => $payload['url'] ?? null,
            'include_images' => $payload['include_images'] ?? true,
            'seed' => [],
            'source' => $job->source ?: 'Single Import',
        ], $job);

        $job->update([
            'status' => $this->statusForResult($result),
            'result_society_id' => $result['id'] ?? null,
            'imported_count' => ($result['status'] ?? '') === 'created' ? 1 : 0,
            'failed_count' => ($result['status'] ?? '') === 'failed' ? 1 : 0,
            'results' => [$result],
            'completed_at' => now(),
        ]);

        return $job->refresh();
    }

    private function processBulkList(SocietyImportJob $job): SocietyImportJob
    {
        $results = $job->results ?: [];
        if ($results === []) {
            return $this->failJob($job, 'No rows to import.');
        }

        $start = microtime(true);

        foreach ($results as $index => $item) {
            if (($item['status'] ?? '') !== 'pending') {
                continue;
            }

            $name = trim((string) ($item['name'] ?? ''));
            if ($name === '') {
                $results[$index] = ['name' => $name, 'status' => 'failed', 'message' => 'Empty name'];
            } else {
                $seed = array_filter([
                    'city' => $item['city'] ?? null,
                    'sector' => $item['sector'] ?? null,
                    'locality' => $item['locality'] ?? null,
                    'builder' => $item['builder'] ?? null,
                    'google_maps_url' => $item['google_maps_url'] ?? null,
                ], fn ($v) => trim((string) $v) !== '');

                $results[$index] = $this->importOne([
                    'name' => $name,
                    'location' => $item['location'] ?? trim(implode(' ', array_filter([
                        $seed['sector'] ?? null, $seed['locality'] ?? null, $seed['city'] ?? null,
                    ]))),
                    'url' => $item['url'] ?? null,
                    'include_images' => $item['include_images'] ?? true,
                    'seed' => $seed,
                    'source' => $job->source ?: 'Bulk Import',
                    'row_number' => $item['row_number'] ?? null,
                ], $job);
            }

            $job->update(['results' => $results]); // persist progress so polling shows it live

            if (microtime(true) - $start >= self::TICK_BUDGET_SECONDS) {
                break;
            }
        }

        return $this->completeBulk($job, $results);
    }

    private function importOne(array $input, SocietyImportJob $job): array
    {
        $name = trim((string) $input['name']);

        if (mb_strlen($name) < 3) {
            return ['name' => $name, 'status' => 'failed', 'message' => 'Name too short'];
        }

        if ($existing = $this->findExisting($name)) {
            $this->log($job, "Skipped duplicate: {$existing->name} (ID {$existing->id}).");

            return [
                'name' => $existing->name,
                'status' => 'skipped',
                'id' => $existing->id,
                'edit_url' => "/admin/societies/{$existing->id}/edit",
                'message' => 'Duplicate skipped',
            ];
        }

        $outcome = $this->pipeline->build($input);

        foreach (($outcome['logs'] ?? []) as $line) {
            $this->log($job, $name.' — '.$line);
        }

        if (($outcome['status'] ?? '') !== 'ok') {
            return ['name' => $name, 'status' => 'failed', 'message' => $outcome['message'] ?? 'Import failed'];
        }

        $attr = $outcome['attributes'];
        $attr['slug'] = $this->uniqueSlug((string) ($attr['name'] ?? $name));
        $society = Society::create($attr);

        $this->log($job, "Draft created: {$society->name} (ID {$society->id}). Review before publishing.");

        return [
            'name' => $society->name,
            'status' => 'created',
            'id' => $society->id,
            'edit_url' => "/admin/societies/{$society->id}/edit",
            'message' => 'Draft created',
            'row_number' => $input['row_number'] ?? null,
            'image_candidate_count' => is_array($society->image_candidates) ? count($society->image_candidates) : 0,
            'image_url' => $society->image_url,
            'image_status' => $society->image_status,
            'score' => $society->score,
            'source_confidence_score' => $society->source_confidence_score,
        ];
    }

    /**
     * Re-run the grounded pipeline over an existing unpublished draft, preserving
     * its admin-set identity, slug and Draft/unpublished state.
     */
    public function reEnrichDraft(Society $society, bool $includeImages = true): Society
    {
        if ($society->is_published || $society->status !== 'Draft') {
            throw new \InvalidArgumentException('Only unpublished draft societies can be re-enriched.');
        }

        $seed = array_filter([
            'builder' => $society->builder,
            'sector' => $society->sector,
            'locality' => $society->locality,
            'city' => $society->city,
            'google_maps_url' => $society->google_maps_url,
            'place_id' => $society->place_id,
        ], fn ($v) => trim((string) $v) !== '' && strtolower((string) $v) !== 'to be verified');

        $outcome = $this->pipeline->build([
            'name' => $society->name,
            'location' => trim(implode(' ', array_filter([$society->sector, $society->locality, $society->city]))),
            'seed' => $seed,
            'include_images' => $includeImages,
            'source' => 'Gemini Draft Re-enrichment',
        ]);

        if (($outcome['status'] ?? '') !== 'ok') {
            throw new \RuntimeException($outcome['message'] ?? 'Gemini enrichment is unavailable.');
        }

        $attr = $outcome['attributes'];
        $attr['name'] = $society->name;
        unset($attr['slug']); // keep the existing public slug
        $attr['status'] = 'Draft';
        $attr['verification_status'] = 'Needs Review';
        $attr['is_published'] = false;
        $attr['published_at'] = null;
        $attr['imported_at'] = $society->imported_at ?: now();
        $attr['image_approved_by_admin'] = false;

        $society->update($attr);

        return $society->fresh();
    }

    private function completeBulk(SocietyImportJob $job, array $results): SocietyImportJob
    {
        $pending = collect($results)->contains(fn ($item) => ($item['status'] ?? '') === 'pending');
        $imported = collect($results)->where('status', 'created')->count();
        $failed = collect($results)->where('status', 'failed')->count();
        $skipped = collect($results)->where('status', 'skipped')->count();

        if ($pending) {
            $job->update(['imported_count' => $imported, 'failed_count' => $failed]);

            return $job->refresh();
        }

        $job->update([
            'status' => $failed > 0 && $imported === 0 ? 'failed' : 'completed',
            'imported_count' => $imported,
            'failed_count' => $failed,
            'completed_at' => now(),
        ]);

        $this->log($job, "Import finished. Created {$imported}, skipped {$skipped}, failed {$failed}, total ".count($results).'.');

        return $job->refresh();
    }

    private function failJob(SocietyImportJob $job, string $message): SocietyImportJob
    {
        $this->log($job, $message);
        $job->update(['status' => 'failed', 'failed_count' => max(1, (int) $job->failed_count), 'completed_at' => now()]);

        return $job->refresh();
    }

    private function statusForResult(array $result): string
    {
        return match ($result['status'] ?? 'failed') {
            'created' => 'completed',
            'skipped' => 'skipped',
            default => 'failed',
        };
    }

    private function findExisting(string $name): ?Society
    {
        return Society::query()
            ->where('slug', Str::slug($name))
            ->orWhereRaw('LOWER(name) = ?', [mb_strtolower($name)])
            ->first();
    }

    private function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'society';
        $slug = $base;
        $i = 2;

        while (Society::query()->where('slug', $slug)->exists()) {
            $slug = "{$base}-{$i}";
            $i++;
        }

        return $slug;
    }

    private function decode(string $raw): array
    {
        $data = json_decode($raw, true);

        return is_array($data) ? $data : [];
    }

    private function log(SocietyImportJob $job, string $message): void
    {
        $logs = $job->logs ?: [];
        $logs[] = ['ts' => now()->format('H:i:s'), 'msg' => $message];
        $job->update(['logs' => $logs]);
        $job->refresh();
    }
}
