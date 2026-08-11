<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\City;
use App\Models\SocietyImportCandidate;
use App\Models\SocietyImportJob;
use App\Services\Society\Import\SocietyDiscoveryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * The coverage gap, as a working queue.
 *
 * Scanning is one paid Places call per area, so it is an explicit action rather than
 * something the page does on load.
 */
class AdminSocietyDiscoveryController extends Controller
{
    public function index(Request $request, SocietyDiscoveryService $discovery): JsonResponse
    {
        $status = (string) $request->query('status', 'open');

        $query = SocietyImportCandidate::query()->with('society:id,name,slug');

        // "Open" is the working view: everything still needing a decision. The other
        // statuses are there to audit what was decided, not to work through.
        if ($status === 'open') {
            $query->whereIn('status', [SocietyImportCandidate::STATUS_NEW, SocietyImportCandidate::STATUS_LIKELY_DUPLICATE]);
        } elseif ($status !== 'all') {
            $query->where('status', $status);
        }

        if ($request->filled('area')) {
            $query->where('area', 'ilike', '%'.$request->query('area').'%');
        }

        return response()->json([
            'status' => 'ok',
            'configured' => $discovery->configured(),
            'counts' => SocietyImportCandidate::query()
                ->selectRaw('status, count(*) c')
                ->groupBy('status')
                ->pluck('c', 'status'),
            'areas' => SocietyImportCandidate::query()
                ->whereNotNull('area')
                ->selectRaw('area, count(*) c')
                ->groupBy('area')
                ->orderByDesc('c')
                ->limit(40)
                ->get(),
            'candidates' => $query->orderByDesc('rating_count')->orderBy('name')->limit(300)->get(),
        ]);
    }

    public function scan(Request $request, SocietyDiscoveryService $discovery): JsonResponse
    {
        $data = $request->validate([
            'area' => ['required', 'string', 'min:3', 'max:160'],
            'city_id' => ['nullable', 'integer'],
        ]);

        $city = ! empty($data['city_id']) ? City::find($data['city_id']) : null;
        $result = $discovery->scan($data['area'], $city);

        return response()->json(['status' => $result['status'], 'result' => $result], $result['status'] === 'ok' ? 200 : 422);
    }

    public function dismiss(Request $request, SocietyImportCandidate $candidate): JsonResponse
    {
        $data = $request->validate(['reason' => ['nullable', 'string', 'max:160']]);

        $candidate->update([
            'status' => SocietyImportCandidate::STATUS_DISMISSED,
            'status_reason' => $data['reason'] ?? 'Dismissed by admin',
        ]);

        return response()->json(['status' => 'ok', 'candidate' => $candidate->fresh()]);
    }

    public function restore(SocietyImportCandidate $candidate): JsonResponse
    {
        $candidate->update([
            'status' => $candidate->society_id ? SocietyImportCandidate::STATUS_LIKELY_DUPLICATE : SocietyImportCandidate::STATUS_NEW,
            'status_reason' => null,
        ]);

        return response()->json(['status' => 'ok', 'candidate' => $candidate->fresh()]);
    }

    /**
     * Hand the candidate to the importer that already exists.
     *
     * Deliberately not a second import path: everything the normal importer does — sourcing,
     * scoring, images, the draft gate — has to apply here too, and a parallel implementation
     * would drift from it within a month.
     */
    public function import(Request $request, SocietyImportCandidate $candidate): JsonResponse
    {
        $data = $request->validate(['publish' => ['nullable', 'boolean']]);

        $payload = [
            'name' => $candidate->name,
            'location' => $candidate->address ?: $candidate->area,
            'url' => null,
            'include_images' => true,
            'publish' => (bool) ($data['publish'] ?? true),
            // The scan already resolved this place and paid Google for it. Passing the id
            // turns the importer's text search into an exact lookup, so a West Delhi society
            // cannot land on a same-named building elsewhere — or fall through to the
            // pipeline's Gurugram default, which is what happens when a search misses.
            'seed' => array_filter([
                'place_id' => $candidate->place_id,
                'city' => $candidate->city,
                'locality' => $candidate->area,
            ]),
        ];

        $job = SocietyImportJob::create([
            'type' => 'single',
            'input' => json_encode($payload),
            'source' => 'Discovery',
            'status' => 'queued',
            'logs' => [['ts' => now()->format('H:i:s'), 'msg' => 'Queued from discovery: '.$candidate->name.'.']],
        ]);

        $candidate->update([
            'status' => SocietyImportCandidate::STATUS_IMPORTED,
            'status_reason' => 'Queued for import (job #'.$job->id.')',
        ]);

        return response()->json(['status' => 'ok', 'job_id' => $job->id, 'candidate' => $candidate->fresh()]);
    }
}
