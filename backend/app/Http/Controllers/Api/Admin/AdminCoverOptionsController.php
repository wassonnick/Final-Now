<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Society;
use App\Models\SocietyImageContribution;
use App\Services\GoogleStreetViewService;
use Illuminate\Http\JsonResponse;

/**
 * Every cover a society could have, in one list, each previewable.
 *
 * The sources accumulated one at a time — Places photos, official-site scrapes, Street
 * View, a location map, contributed photos — and each arrived with its own rules about
 * rights and its own corner of the edit page. Choosing between them meant knowing all of
 * that. It is a visual decision: show them side by side and let the operator look.
 */
class AdminCoverOptionsController extends Controller
{
    public function __invoke(Society $society, GoogleStreetViewService $streetView): JsonResponse
    {
        $options = [];
        $current = trim((string) ($society->image_photo_reference ?: $society->cover_image ?: ''));

        foreach ((array) ($society->image_candidates ?? []) as $candidate) {
            $source = (string) ($candidate['source'] ?? '');
            $reference = trim((string) ($candidate['photo_reference'] ?? ''));
            $url = trim((string) ($candidate['url'] ?? ''));

            if ($reference === '' && $url === '') {
                continue;
            }

            $options[] = [
                'key' => $reference ?: $url,
                'source' => $source,
                'label' => $this->label($source),
                'photo_reference' => $reference ?: null,
                'url' => $url ?: null,
                'credit' => $candidate['credit'] ?? null,
                // Only Google imagery may auto-approve; a developer's photograph is their
                // copyright until someone here says otherwise.
                'requires_rights' => ! in_array($source, ['google_places', 'google_street_view', 'location_map'], true),
                'publishable_status' => $this->statusFor($source),
                'screen' => $candidate['screen'] ?? null,
                'is_current' => ($reference ?: $url) === $current,
            ];
        }

        // Contributed photos already carry a rights grant, so they are the best option
        // whenever one exists — surfaced here rather than only in the contributions queue.
        foreach (SocietyImageContribution::where('society_id', $society->id)->where('status', 'approved')->latest()->limit(6)->get() as $contribution) {
            $options[] = [
                'key' => (string) $contribution->image_url,
                'source' => 'contribution',
                'label' => $contribution->creditLine(),
                'photo_reference' => null,
                'url' => $contribution->image_url,
                'credit' => $contribution->creditLine(),
                'requires_rights' => false,
                'publishable_status' => $contribution->publishableStatus(),
                'screen' => $contribution->screen,
                'is_current' => (string) $contribution->image_url === $current,
            ];
        }

        // Street View and the map are computed rather than stored: they exist for any
        // society with coordinates, whether or not a harvest ever recorded them.
        if (filled($society->latitude) && filled($society->longitude)) {
            $latitude = (float) $society->latitude;
            $longitude = (float) $society->longitude;

            $svReference = $streetView->reference($latitude, $longitude);
            if (! collect($options)->contains('key', $svReference) && $streetView->hasImagery($latitude, $longitude)) {
                $options[] = [
                    'key' => $svReference,
                    'source' => 'google_street_view',
                    'label' => 'Google Street View',
                    'photo_reference' => $svReference,
                    'url' => null,
                    'credit' => 'Google Street View',
                    'requires_rights' => false,
                    'publishable_status' => 'google_street_view_reference_found',
                    'screen' => null,
                    'is_current' => $svReference === $current,
                ];
            }

            $mapReference = $streetView->mapReference($latitude, $longitude);
            if (! collect($options)->contains('key', $mapReference)) {
                $options[] = [
                    'key' => $mapReference,
                    'source' => 'location_map',
                    'label' => 'Location map',
                    'photo_reference' => $mapReference,
                    'url' => null,
                    'credit' => 'Map data ©Google',
                    'requires_rights' => false,
                    'publishable_status' => 'location_map_reference_found',
                    'screen' => null,
                    'is_current' => $mapReference === $current,
                ];
            }
        }

        return response()->json([
            'options' => $options,
            'current' => $current ?: null,
            'has_coordinates' => filled($society->latitude) && filled($society->longitude),
        ]);
    }

    private function label(string $source): string
    {
        return match ($source) {
            'google_places' => 'Google Places photo',
            'google_street_view' => 'Google Street View',
            'location_map' => 'Location map',
            'official_url' => 'Developer site',
            default => ucfirst(str_replace('_', ' ', $source ?: 'source')),
        };
    }

    private function statusFor(string $source): string
    {
        return match ($source) {
            'google_places' => 'google_places_reference_found',
            'google_street_view' => 'google_street_view_reference_found',
            'location_map' => 'location_map_reference_found',
            default => 'developer_permission_received',
        };
    }
}
