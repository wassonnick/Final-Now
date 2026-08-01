<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Jobs\ReharvestSocietyImages;
use App\Models\ImageReharvestRun;
use App\Models\Society;
use App\Services\Society\Import\SocietyImageReharvestService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin surface for re-running image discovery over societies that are already imported.
 */
class AdminImageReharvestController extends Controller
{
    /** A whole-catalogue run is fine; an unbounded one is not. */
    private const MAX_BULK = 400;

    /** Single society, run inline so the admin sees the outcome immediately. */
    public function single(Request $request, Society $society, SocietyImageReharvestService $reharvest): JsonResponse
    {
        $data = $request->validate([
            'screen' => ['sometimes', 'boolean'],
            'republish' => ['sometimes', 'boolean'],
        ]);

        $result = $reharvest->reharvest(
            $society,
            (bool) ($data['screen'] ?? true),
            (bool) ($data['republish'] ?? true),
        );

        // reharvest() saved through this same instance, so it already holds the new
        // values. (fresh() takes RELATIONS to eager-load, not columns — passing ['id']
        // made Laravel look for a relationship named "id" and throw.)
        return response()->json([
            'result' => $result,
            'society' => [
                'id' => $society->id,
                'image_status' => $society->image_status,
                'image_approved_by_admin' => (bool) $society->image_approved_by_admin,
                'image_candidates' => $society->image_candidates,
            ],
        ]);
    }

    /** Bulk: queue one job per society and hand back a run to poll. */
    public function bulk(Request $request): JsonResponse
    {
        $data = $request->validate([
            'scope' => ['required', 'in:selection,missing_images,unscreened,all'],
            'society_ids' => ['sometimes', 'array', 'max:'.self::MAX_BULK],
            'society_ids.*' => ['integer'],
            'city_id' => ['sometimes', 'nullable', 'integer'],
            'limit' => ['sometimes', 'integer', 'min:1', 'max:'.self::MAX_BULK],
            'screen' => ['sometimes', 'boolean'],
            'republish' => ['sometimes', 'boolean'],
            'force' => ['sometimes', 'boolean'],
        ]);

        // A restore is worth nothing if Google will not serve the photos. Checking one
        // real fetch first costs a second and saves a few hundred pointless jobs.
        if (empty($data['force']) && ! $this->placesCanServePhotos($reason)) {
            return response()->json([
                'message' => 'Google Places cannot serve photos right now, so this run would refresh candidates and publish no covers. '
                    .$reason.' Fix it and retry, or send force=true to run anyway.',
                'run' => null,
            ], 422);
        }

        $ids = $this->targetIds($data);

        if ($ids === []) {
            return response()->json(['message' => 'No societies matched that scope.', 'run' => null], 422);
        }

        $run = ImageReharvestRun::create([
            'scope' => $data['scope'],
            'queued' => count($ids),
            'screen_images' => (bool) ($data['screen'] ?? true),
            'republish_cover' => (bool) ($data['republish'] ?? true),
        ]);

        foreach ($ids as $id) {
            ReharvestSocietyImages::dispatch($id, $run->id, $run->screen_images, $run->republish_cover);
        }

        return response()->json(['run' => $run->fresh()], 202);
    }

    public function run(ImageReharvestRun $run): JsonResponse
    {
        return response()->json(['run' => $run, 'finished' => $run->isFinished()]);
    }

    public function runs(): JsonResponse
    {
        return response()->json([
            'runs' => ImageReharvestRun::latest()->limit(20)->get(),
        ]);
    }

    /** One real photo fetch, to find out whether a restore can actually restore anything. */
    private function placesCanServePhotos(?string &$reason = null): bool
    {
        $key = trim((string) config('services.google_places_api_key', ''));

        if ($key === '') {
            $reason = 'No Google Places API key is configured.';

            return false;
        }

        try {
            $place = app(\App\Services\Society\Import\PlaceResolverService::class)
                ->resolve('DLF Privana North', 'Sector 77 Gurugram');
            $reference = (array) ($place['photo_references'] ?? []);

            if ($reference === []) {
                // Inconclusive rather than failing: the probe society may simply have no
                // photos, which says nothing about the endpoint.
                return true;
            }

            app(\App\Services\GooglePlacesSocietyImageService::class)->fetchPhotoByReference((string) $reference[0], 400);

            return true;
        } catch (\Throwable $e) {
            $reason = 'Google said: '.mb_substr($e->getMessage(), 0, 160);

            return false;
        }
    }

    /**
     * @param  array<string,mixed>  $data
     * @return array<int,int>
     */
    private function targetIds(array $data): array
    {
        $limit = (int) ($data['limit'] ?? self::MAX_BULK);

        if ($data['scope'] === 'selection') {
            return array_values(array_unique(array_map('intval', (array) ($data['society_ids'] ?? []))));
        }

        $query = Society::query()->select('id');

        if (! empty($data['city_id'])) {
            $query->where('city_id', (int) $data['city_id']);
        }

        if ($data['scope'] === 'missing_images') {
            // The same definition the dashboard counts by, so the two never disagree.
            $query->where(fn ($q) => $q->whereNull('image_approved_by_admin')->orWhere('image_approved_by_admin', false));
        }

        if ($data['scope'] === 'unscreened') {
            // Imported before the vision screen existed: candidates on file, none carrying
            // a screen verdict. Cheapest useful pass over the back catalogue.
            // Postgres needs the json column cast before LIKE; sqlite (tests) does not.
            $column = Society::query()->getConnection()->getDriverName() === 'pgsql'
                ? 'image_candidates::text'
                : 'image_candidates';
            $query->whereNotNull('image_candidates')
                ->whereRaw($column.' NOT LIKE ?', ['%"screen"%']);
        }

        return $query->orderBy('id')->limit(min($limit, self::MAX_BULK))->pluck('id')->all();
    }
}
