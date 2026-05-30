<?php

namespace App\Console\Commands;

use App\Models\Society;
use App\Services\SocietyEnrichment\SocietyUrlEnrichmentService;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

class FetchSocietyFromUrl extends Command
{
    protected $signature = 'societies:fetch-from-url
        {url : Official project/developer URL}
        {--save : Save or update the fetched draft society}';

    protected $description = 'Fetch a draft society profile from an official project URL without publishing it.';

    public function handle(SocietyUrlEnrichmentService $enrichment): int
    {
        try {
            $result = $enrichment->fetchDraft((string) $this->argument('url'));
        } catch (\Throwable $exception) {
            $this->error($exception->getMessage());
            return self::FAILURE;
        }

        $data = $result['data'];
        $this->info('Draft fetched from official URL:');
        $this->line(json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));

        if (!$this->option('save')) {
            $this->warn('Dry run only. Pass --save to create/update this society as Draft.');
            return self::SUCCESS;
        }

        $data['slug'] = $data['slug'] ?: Str::slug((string) $data['name']);
        $data['status'] = 'Draft';
        $data['is_published'] = false;
        $data['published_at'] = null;

        $society = Society::query()
            ->where('official_project_url', $data['official_project_url'])
            ->orWhere('slug', $data['slug'])
            ->first();

        if ($society) {
            $society->update($data);
            $this->info("Updated existing society #{$society->id}: {$society->name}");
            return self::SUCCESS;
        }

        $society = Society::create($data);
        $this->info("Created draft society #{$society->id}: {$society->name}");

        return self::SUCCESS;
    }
}
