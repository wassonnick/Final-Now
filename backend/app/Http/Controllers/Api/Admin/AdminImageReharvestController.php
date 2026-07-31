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

        return response()->json([
            'result' => $result,
            'society' => $society->fresh(['id']) ? [
                'id' => $society->id,
                'image_status' => $society->image_status,
                'image_approved_by_admin' => (bool) $society->image_approved_by_admin,
                'image_candidates' => $society->image_candidates,
            ] : null,
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
        ]);

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
