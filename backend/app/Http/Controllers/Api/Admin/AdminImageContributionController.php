<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SocietyImageContribution;
use App\Services\Society\Import\SocietyImageScreenService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Review queue for contributed images. Approving one is the only path in the system that
 * puts an image on the public site with the rights question already answered.
 */
class AdminImageContributionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $status = (string) $request->query('status', 'pending');

        $query = SocietyImageContribution::with('society:id,name,slug,city')->latest();

        if (in_array($status, ['pending', 'approved', 'rejected'], true)) {
            $query->where('status', $status);
        }

        return response()->json([
            'contributions' => $query->limit(100)->get(),
            'counts' => [
                'pending' => SocietyImageContribution::where('status', 'pending')->count(),
                'approved' => SocietyImageContribution::where('status', 'approved')->count(),
                'rejected' => SocietyImageContribution::where('status', 'rejected')->count(),
            ],
        ]);
    }

    /**
     * Approve, and put the image where the public site reads from.
     *
     * The society's image_status records HOW the right was obtained — a resident's own
     * photograph and a developer's marketing image are publishable on different grounds
     * — so a year from now the claim is still checkable from the row itself.
     */
    public function approve(Request $request, SocietyImageContribution $contribution): JsonResponse
    {
        $data = $request->validate([
            'as_cover' => ['sometimes', 'boolean'],
            'review_notes' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        if (! $contribution->rights_granted) {
            return response()->json([
                'message' => 'This contribution carries no rights grant and cannot be published.',
            ], 422);
        }

        $society = $contribution->society;
        $asCover = (bool) ($data['as_cover'] ?? true);
        $url = $contribution->image_url;

        if ($society && $url) {
            if ($asCover) {
                $society->cover_image = $url;
                $society->image_url = $url;
                $society->image_status = $contribution->publishableStatus();
                $society->image_approved_by_admin = true;
                $society->image_credit = $contribution->creditLine();
                $society->image_alt_text = $contribution->caption ?: ($society->name.' — '.$contribution->creditLine());
                // A contributed image supersedes a Google reference; leaving the old
                // reference set would keep the society pointing at the proxy instead.
                $society->image_photo_reference = null;
            } else {
                $gallery = array_values(array_unique(array_merge((array) ($society->gallery_images ?? []), [$url])));
                $society->gallery_images = array_slice($gallery, 0, 12);
            }

            $society->save();
        }

        $contribution->update([
            'status' => 'approved',
            'used_as_cover' => $asCover,
            'review_notes' => $data['review_notes'] ?? null,
            'reviewed_by' => 'admin',
            'reviewed_at' => now(),
        ]);

        return response()->json(['status' => 'ok', 'contribution' => $contribution->fresh()]);
    }

    public function reject(Request $request, SocietyImageContribution $contribution): JsonResponse
    {
        $data = $request->validate([
            'review_notes' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $contribution->update([
            'status' => 'rejected',
            'review_notes' => $data['review_notes'] ?? null,
            'reviewed_by' => 'admin',
            'reviewed_at' => now(),
        ]);

        return response()->json(['status' => 'ok', 'contribution' => $contribution->fresh()]);
    }

    /**
     * Run the same vision screen used on harvested images. Contributed photos are far
     * likelier to be legitimate, but "my family outside the tower" is exactly the sort of
     * well-meant photo that should not become a society's cover.
     */
    public function screen(SocietyImageContribution $contribution, SocietyImageScreenService $screen): JsonResponse
    {
        $result = $screen->screen(
            ['url' => $contribution->image_url],
            (string) ($contribution->society->name ?? ''),
        );

        $contribution->update(['screen' => $result]);

        return response()->json(['status' => 'ok', 'screen' => $result]);
    }
}
