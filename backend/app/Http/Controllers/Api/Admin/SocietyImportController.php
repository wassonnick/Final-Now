<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Society;
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
        $request->validate(['file' => ['required', 'file', 'mimes:xlsx,csv', 'max:5120'], 'include_images' => ['nullable', 'boolean']]);
        $rows = $parser->parse($request->file('file'));
        $includeImages = $request->boolean('include_images');
        $job = SocietyImportJob::create([
            'type' => 'bulk_spreadsheet',
            'input' => json_encode(['filename' => $request->file('file')->getClientOriginalName(), 'row_count' => count($rows)]),
            'source' => 'Gemini Spreadsheet Import',
            'status' => 'queued',
            'results' => array_map(fn ($row) => [...$row, 'name' => $row['society_name'], 'status' => 'pending', 'include_images' => $includeImages], $rows),
            'logs' => [['ts' => now()->format('H:i:s'), 'msg' => 'Validated spreadsheet and queued '.count($rows).' society drafts.']],
            'triggered_by' => $request->header('X-Admin-Email') ?: 'admin',
        ]);

        return response()->json(['status' => 'ok', 'message' => 'Spreadsheet validated. '.count($rows).' Gemini draft imports queued.', 'data' => $job, 'preview' => array_slice($rows, 0, 10)], 202);
    }

    public function imageDecision(Request $request, Society $society): JsonResponse
    {
        $data = $request->validate(['decision' => ['required', 'in:approve,reject'], 'rights_confirmed' => ['nullable', 'boolean']]);
        if (! $society->imported_at) {
            return response()->json(['message' => 'Only imported society image candidates can be reviewed here.'], 422);
        }
        if ($data['decision'] === 'reject') {
            $society->update(['cover_image' => null, 'image_url' => null, 'image_status' => 'rejected', 'image_approved_by_admin' => false]);

            return response()->json(['message' => 'Image candidate rejected and kept off public pages.', 'data' => $society->fresh()]);
        }
        if (! ($data['rights_confirmed'] ?? false)) {
            return response()->json(['message' => 'Confirm image rights, permission and attribution before approval.'], 422);
        }
        if ($society->image_status === 'google_places_reference_found' && $society->place_id && str_contains(strtolower((string) $society->image_credit), 'google')) {
            $society->update(['image_approved_by_admin' => true, 'image_license_notes' => $society->image_license_notes ?: 'Google Places attribution/display terms reviewed and approved by admin.']);

            return response()->json(['message' => 'Google Places image display approved with attribution. It remains hidden until the society is published.', 'data' => $society->fresh()]);
        }
        $candidate = trim((string) ($society->image_url ?: $society->image_reference_url));
        if (! $this->isDirectImageUrl($candidate)) {
            return response()->json(['message' => 'Only a direct JPG, PNG, WebP, GIF or AVIF URL can be approved. Keep Google Places/search/page links as references.'], 422);
        }
        $society->update(['image_url' => $candidate, 'cover_image' => $candidate, 'image_status' => 'approved_for_live', 'image_approved_by_admin' => true, 'image_credit' => $society->image_credit ?: 'Admin-approved source', 'image_license_notes' => $society->image_license_notes ?: 'Rights/permission and attribution confirmed by admin.']);

        return response()->json(['message' => 'Image approved. It can display only after the society itself is published.', 'data' => $society->fresh()]);
    }

    private function isDirectImageUrl(string $url): bool
    {
        if (! filter_var($url, FILTER_VALIDATE_URL) || ! preg_match('/^https?:\/\//i', $url)) {
            return false;
        }
        if (preg_match('/google\.(com|co\.in)\/search|maps\.google|maps\.app\.goo\.gl/i', $url)) {
            return false;
        }

        return (bool) preg_match('/\.(png|jpe?g|webp|gif|avif)(\?.*)?$/i', $url);
    }
}
