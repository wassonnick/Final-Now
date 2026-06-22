<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SocietyImportJob;
use App\Services\SocietyAiEnrichmentService;
use App\Services\SocietyImportService;
use App\Services\SocietySpreadsheetParser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SocietyImportController extends Controller
{
    public function __construct(
        private SocietyImportService $service,
        private SocietyAiEnrichmentService $ai
    ) {}

    public function jobs(Request $request): JsonResponse
    {
        SocietyImportJob::query()
            ->whereIn('status', ['queued', 'running'])
            ->latest()
            ->limit(8)
            ->get()
            ->each(fn (SocietyImportJob $job) => $this->service->processJobTick($job));

        $jobs = SocietyImportJob::query()
            ->with('society:id,name,slug,status,is_published')
            ->latest()
            ->limit((int) $request->integer('limit', 25))
            ->get();

        return response()->json([
            'status' => 'ok',
            'data' => $jobs,
        ]);
    }

    public function show(SocietyImportJob $job): JsonResponse
    {
        $this->service->processJobTick($job);

        return response()->json([
            'status' => 'ok',
            'data' => $job->fresh('society:id,name,slug,status,is_published'),
        ]);
    }

    public function destroy(SocietyImportJob $job): JsonResponse
    {
        $job->delete();

        return response()->json([
            'status' => 'ok',
            'message' => 'Import job removed.',
        ]);
    }

    public function suggestions(Request $request): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'data' => $this->service->quickAddSuggestions((int) $request->integer('limit', 80)),
        ]);
    }

    public function aiStatus(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'data' => $this->ai->status(),
        ]);
    }

    public function byName(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:3', 'max:160'],
        ]);

        $job = SocietyImportJob::create([
            'type' => 'by_name',
            'input' => trim($data['name']),
            'source' => 'Name Import',
            'status' => 'queued',
            'logs' => [[
                'ts' => now()->format('H:i:s'),
                'msg' => 'Queued name import.',
            ]],
            'triggered_by' => $request->header('X-Admin-Email') ?: 'admin',
        ]);

        return response()->json([
            'status' => 'ok',
            'message' => 'Name import queued.',
            'data' => $job,
        ], 202);
    }

    public function byUrl(Request $request): JsonResponse
    {
        $data = $request->validate([
            'url' => ['required', 'url', 'max:2000'],
        ]);

        $job = SocietyImportJob::create([
            'type' => 'by_url',
            'input' => trim($data['url']),
            'source' => 'URL Import',
            'status' => 'queued',
            'logs' => [[
                'ts' => now()->format('H:i:s'),
                'msg' => 'Queued URL import.',
            ]],
            'triggered_by' => $request->header('X-Admin-Email') ?: 'admin',
        ]);

        return response()->json([
            'status' => 'ok',
            'message' => 'URL import queued.',
            'data' => $job,
        ], 202);
    }

    public function bulk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'source' => ['required', 'string', 'max:80'],
            'locality' => ['nullable', 'string', 'max:120'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:40'],
        ]);

        $payload = [
            'source' => $data['source'],
            'locality' => $data['locality'] ?? 'Gurgaon',
            'limit' => $data['limit'] ?? 12,
        ];

        $job = SocietyImportJob::create([
            'type' => 'bulk_source',
            'input' => json_encode($payload),
            'source' => $data['source'],
            'status' => 'queued',
            'logs' => [[
                'ts' => now()->format('H:i:s'),
                'msg' => 'Queued bulk source import.',
            ]],
            'triggered_by' => $request->header('X-Admin-Email') ?: 'admin',
        ]);

        return response()->json([
            'status' => 'ok',
            'message' => 'Bulk source import queued.',
            'data' => $job,
        ], 202);
    }

    public function bulkNames(Request $request): JsonResponse
    {
        $data = $request->validate([
            'names' => ['required'],
        ]);

        $names = $data['names'];

        if (is_string($names)) {
            $names = preg_split('/[\r\n,]+/', $names) ?: [];
        }

        if (! is_array($names)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Names must be a list or newline separated text.',
            ], 422);
        }

        $names = array_values(array_unique(array_filter(array_map(
            fn ($name) => trim((string) $name),
            $names
        ))));

        if (empty($names)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Add at least one society name.',
            ], 422);
        }

        $job = SocietyImportJob::create([
            'type' => 'bulk_names',
            'input' => json_encode($names),
            'source' => 'Name List Import',
            'status' => 'queued',
            'logs' => [[
                'ts' => now()->format('H:i:s'),
                'msg' => 'Queued name-list import for '.count($names).' societies.',
            ]],
            'triggered_by' => $request->header('X-Admin-Email') ?: 'admin',
        ]);

        return response()->json([
            'status' => 'ok',
            'message' => 'Name list import queued.',
            'data' => $job,
        ], 202);
    }

    public function spreadsheet(Request $request, SocietySpreadsheetParser $parser): JsonResponse
    {
        $request->validate(['file' => ['required', 'file', 'mimes:xlsx,csv', 'max:5120']]);
        $rows = $parser->parse($request->file('file'));
        $job = SocietyImportJob::create([
            'type' => 'bulk_spreadsheet',
            'input' => json_encode(['filename' => $request->file('file')->getClientOriginalName(), 'row_count' => count($rows)]),
            'source' => 'Gemini Spreadsheet Import',
            'status' => 'queued',
            'results' => array_map(fn ($row) => [...$row, 'name' => $row['society_name'], 'status' => 'pending'], $rows),
            'logs' => [['ts' => now()->format('H:i:s'), 'msg' => 'Validated spreadsheet and queued '.count($rows).' society drafts.']],
            'triggered_by' => $request->header('X-Admin-Email') ?: 'admin',
        ]);

        return response()->json(['status' => 'ok', 'message' => 'Spreadsheet validated. '.count($rows).' Gemini draft imports queued.', 'data' => $job, 'preview' => array_slice($rows, 0, 10)], 202);
    }
}
