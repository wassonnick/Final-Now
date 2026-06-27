<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Society;
use App\Models\SocietyImportJob;
use App\Services\GooglePlacesSocietyImageService;
use App\Services\SocietyAiEnrichmentService;
use App\Services\SocietyImportService;
use App\Services\SocietySpreadsheetParser;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

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

        return response()->json(['status' => 'ok', 'data' => $jobs]);
    }

    public function show(SocietyImportJob $job): JsonResponse
    {
        $this->service->processJobTick($job);

        return response()->json(['status' => 'ok', 'data' => $job->fresh('society:id,name,slug,status,is_published')]);
    }

    public function destroy(SocietyImportJob $job): JsonResponse
    {
        $job->delete();

        return response()->json(['status' => 'ok', 'message' => 'Import job removed.']);
    }

    public function aiStatus(): JsonResponse
    {
        return response()->json(['status' => 'ok', 'data' => $this->ai->status()]);
    }

    /** Admin-only proxy: returns the image bytes for a Google Places photo reference (for inline candidate previews). */
    public function placePhoto(Request $request, GooglePlacesSocietyImageService $places): HttpResponse
    {
        $reference = trim((string) $request->query('reference', ''));
        if ($reference === '') {
            return response()->json(['message' => 'A Google Places photo reference is required.'], 422);
        }

        try {
            $photo = $places->fetchPhotoByReference($reference, (int) $request->integer('w', 720));
        } catch (\Throwable $e) {
            return response()->json(['message' => 'Google Places photo could not be loaded.'], 404);
        }

        return response($photo['body'], 200)
            ->header('Content-Type', $photo['content_type'])
            ->header('Cache-Control', 'private, max-age=3600')
            ->header('X-SocietyFlats-Image-Source', 'Google Places');
    }

    /** Single import: project name + optional location/URL. */
    public function single(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'min:3', 'max:160'],
            'location' => ['nullable', 'string', 'max:200'],
            'url' => ['nullable', 'url', 'max:2000'],
            'include_images' => ['nullable', 'boolean'],
        ]);

        $payload = [
            'name' => trim($data['name']),
            'location' => isset($data['location']) ? trim($data['location']) : null,
            'url' => $data['url'] ?? null,
            'include_images' => $request->boolean('include_images', true),
        ];

        $job = SocietyImportJob::create([
            'type' => 'single',
            'input' => json_encode($payload),
            'source' => 'Single Import',
            'status' => 'queued',
            'logs' => [['ts' => now()->format('H:i:s'), 'msg' => 'Queued single import for '.$payload['name'].'.']],
            'triggered_by' => $request->header('X-Admin-Email') ?: 'admin',
        ]);

        return response()->json(['status' => 'ok', 'message' => 'Single import queued.', 'data' => $job], 202);
    }

    /** Bulk import: list of "Name" or "Name, Location" lines, or [{name, location}] objects. */
    public function bulk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'items' => ['required'],
            'include_images' => ['nullable', 'boolean'],
        ]);

        $items = $this->normalizeBulkItems($data['items']);
        if ($items === []) {
            return response()->json(['status' => 'error', 'message' => 'Add at least one society (name, optionally with a location).'], 422);
        }

        $includeImages = $request->boolean('include_images', true);
        $results = array_map(fn ($item) => [
            'name' => $item['name'],
            'location' => $item['location'],
            'status' => 'pending',
            'include_images' => $includeImages,
        ], $items);

        $job = SocietyImportJob::create([
            'type' => 'bulk_names',
            'input' => json_encode(['count' => count($results)]),
            'source' => 'Bulk Import',
            'status' => 'queued',
            'results' => $results,
            'logs' => [['ts' => now()->format('H:i:s'), 'msg' => 'Queued bulk import for '.count($results).' societies.']],
            'triggered_by' => $request->header('X-Admin-Email') ?: 'admin',
        ]);

        return response()->json(['status' => 'ok', 'message' => 'Bulk import queued.', 'data' => $job], 202);
    }

    public function spreadsheet(Request $request, SocietySpreadsheetParser $parser): JsonResponse
    {
        $request->validate(['file' => ['required', 'file', 'mimes:xlsx,csv', 'max:5120'], 'include_images' => ['nullable', 'boolean']]);
        $rows = $parser->parse($request->file('file'));
        $includeImages = $request->boolean('include_images');

        $job = SocietyImportJob::create([
            'type' => 'bulk_spreadsheet',
            'input' => json_encode(['filename' => $request->file('file')->getClientOriginalName(), 'row_count' => count($rows)]),
            'source' => 'Spreadsheet Import',
            'status' => 'queued',
            'results' => array_map(fn ($row) => [...$row, 'name' => $row['society_name'], 'status' => 'pending', 'include_images' => $includeImages], $rows),
            'logs' => [['ts' => now()->format('H:i:s'), 'msg' => 'Validated spreadsheet and queued '.count($rows).' society drafts.']],
            'triggered_by' => $request->header('X-Admin-Email') ?: 'admin',
        ]);

        return response()->json(['status' => 'ok', 'message' => 'Spreadsheet validated. '.count($rows).' draft imports queued.', 'data' => $job, 'preview' => array_slice($rows, 0, 10)], 202);
    }

    /** Approve/reject the single cover image candidate (Gemini/Google Places reference flow). */
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

    /** Approve / reject / set-as-cover for one entry in the multi-source image candidate gallery. */
    public function imageCandidateDecision(Request $request, Society $society): JsonResponse
    {
        $data = $request->validate([
            'index' => ['required', 'integer', 'min:0'],
            'action' => ['required', 'in:approve,reject,cover'],
            'rights_confirmed' => ['nullable', 'boolean'],
        ]);

        $candidates = array_values(is_array($society->image_candidates) ? $society->image_candidates : []);
        $index = $data['index'];
        if (! isset($candidates[$index])) {
            return response()->json(['message' => 'Image candidate not found.'], 422);
        }

        if ($data['action'] === 'reject') {
            array_splice($candidates, $index, 1);
            $society->update(['image_candidates' => array_values($candidates)]);

            return response()->json(['message' => 'Image candidate removed.', 'data' => $society->fresh()]);
        }

        if (! ($data['rights_confirmed'] ?? false)) {
            return response()->json(['message' => 'Confirm image rights, permission and attribution before approval.'], 422);
        }

        // Google Places candidate: store the chosen reference; the publish-gated photo
        // proxy serves it live on demand (with attribution), never cached.
        $candidate = $candidates[$index];
        if (($candidate['source'] ?? '') === 'google_places' && ! empty($candidate['photo_reference'])) {
            foreach ($candidates as $i => $entry) {
                $candidates[$i]['is_cover'] = $i === $index;
                $candidates[$i]['approved'] = ($candidates[$i]['approved'] ?? false) || $i === $index;
            }
            $candidates[$index]['rights_confirmed'] = true;

            $society->update([
                'image_photo_reference' => $candidate['photo_reference'],
                'place_id' => $candidate['place_id'] ?: $society->place_id,
                'image_status' => 'google_places_reference_found',
                'image_credit' => $society->image_credit ?: 'Google Places',
                'image_approved_by_admin' => true,
                'image_license_notes' => $society->image_license_notes ?: 'Google Places photo served on demand via API with attribution; approved by admin.',
                'cover_image' => null,
                'image_url' => null,
                'image_candidates' => array_values($candidates),
            ]);

            return response()->json(['message' => 'Google Places photo approved as cover. It is served with attribution and only after the society is published.', 'data' => $society->fresh()]);
        }

        $url = trim((string) ($candidates[$index]['url'] ?? ''));
        if (! $this->isDirectImageUrl($url)) {
            return response()->json(['message' => 'Only a direct image URL can be approved here. Use the cover image flow for Google Places photo references.'], 422);
        }

        $candidates[$index]['approved'] = true;
        $candidates[$index]['rights_confirmed'] = true;

        $approved = array_values(is_array($society->approved_gallery_image_urls) ? $society->approved_gallery_image_urls : []);
        if (! in_array($url, $approved, true)) {
            $approved[] = $url;
        }

        $update = ['approved_gallery_image_urls' => $approved];

        if ($data['action'] === 'cover' || trim((string) $society->cover_image) === '') {
            foreach ($candidates as $i => $candidate) {
                $candidates[$i]['is_cover'] = $i === $index;
            }
            $update += [
                'cover_image' => $url,
                'image_url' => $url,
                'image_status' => 'approved_for_live',
                'image_approved_by_admin' => true,
                'image_credit' => $society->image_credit ?: ($candidates[$index]['credit'] ?? 'Admin-approved source'),
                'image_license_notes' => $society->image_license_notes ?: ($candidates[$index]['license_note'] ?? 'Rights/permission and attribution confirmed by admin.'),
            ];
        }

        $update['image_candidates'] = array_values($candidates);
        $society->update($update);

        return response()->json(['message' => 'Image candidate approved. It can display only after the society is published.', 'data' => $society->fresh()]);
    }

    /** Publish a reviewed draft straight from the importer: score + location required, image optional. */
    public function publish(Society $society): JsonResponse
    {
        if ((float) $society->score <= 0) {
            return response()->json(['message' => 'Set a society score before publishing.'], 422);
        }
        if (trim((string) $society->sector) === '' && trim((string) $society->locality) === '') {
            return response()->json(['message' => 'Add a sector or locality before publishing.'], 422);
        }

        $society->update([
            'status' => 'Verified',
            'verification_status' => 'Verified',
            'is_published' => true,
            'published_at' => $society->published_at ?: now(),
        ]);

        return response()->json([
            'message' => 'Society published — it is now live on public pages.',
            'data' => $society->fresh(),
        ]);
    }

    public function reEnrich(Request $request, Society $society): JsonResponse
    {
        try {
            $draft = $this->service->reEnrichDraft($society, $request->boolean('include_images', true));
        } catch (\InvalidArgumentException $exception) {
            return response()->json(['message' => $exception->getMessage()], 422);
        } catch (\Throwable $exception) {
            return response()->json(['message' => 'Gemini could not complete draft re-enrichment.', 'detail' => $exception->getMessage()], 422);
        }

        return response()->json(['message' => 'Draft re-enriched with grounded data. Review every field before publishing.', 'data' => $draft]);
    }

    /** @return array<int,array{name:string,location:?string}> */
    private function normalizeBulkItems(mixed $items): array
    {
        if (is_string($items)) {
            $items = preg_split('/\r\n|\r|\n/', $items) ?: [];
        }
        if (! is_array($items)) {
            return [];
        }

        $out = [];
        $seen = [];

        foreach ($items as $row) {
            if (is_array($row)) {
                $name = trim((string) ($row['name'] ?? ''));
                $location = trim((string) ($row['location'] ?? ''));
            } else {
                $line = trim((string) $row);
                if ($line === '') {
                    continue;
                }
                $parts = array_map('trim', explode(',', $line, 2));
                $name = $parts[0];
                $location = $parts[1] ?? '';
            }

            if ($name === '' || mb_strlen($name) < 3) {
                continue;
            }
            $key = mb_strtolower($name);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;
            $out[] = ['name' => $name, 'location' => $location !== '' ? $location : null];
        }

        return $out;
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
