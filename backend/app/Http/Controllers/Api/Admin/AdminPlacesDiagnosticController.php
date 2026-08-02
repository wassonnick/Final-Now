<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Services\Society\Import\PlaceResolverService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

/**
 * Runs the three Google Places calls the importer depends on and reports exactly what
 * came back from each.
 *
 * Every photo in the review queue fails with Google's generic HTML "Error 400", on
 * references resolved seconds earlier — so the usual explanation (references expire)
 * cannot be it. Search and Details succeed against the same key, which rules out the
 * key being dead outright. Somewhere between those two facts is the answer, and reading
 * the code has stopped being able to find it: we need to see the request we actually
 * send and the reply Google actually gives.
 *
 * The API key is redacted from everything this returns.
 */
class AdminPlacesDiagnosticController extends Controller
{
    public function __invoke(Request $request, PlaceResolverService $places): JsonResponse
    {
        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:200'],
            'location' => ['sometimes', 'string', 'max:200'],
        ]);

        $key = trim((string) config('services.google_places_api_key', ''));
        $name = trim((string) ($data['name'] ?? 'DLF Privana North'));
        $location = trim((string) ($data['location'] ?? 'Sector 77 Gurugram'));

        $out = [
            'key_configured' => $key !== '',
            'key_length' => strlen($key),
            'key_tail' => $key === '' ? null : '...'.substr($key, -4),
            'query' => ['name' => $name, 'location' => $location],
        ];

        if ($key === '') {
            $out['verdict'] = 'GOOGLE_PLACES_API_KEY is not configured on this service.';

            return response()->json($out);
        }

        // 1 + 2. Search and details, through the same resolver the importer uses.
        $place = $places->resolve($name, $location);
        $references = (array) ($place['photo_references'] ?? []);

        $out['resolve'] = [
            'matched' => (bool) ($place['matched'] ?? false),
            'reason' => $place['reason'] ?? null,
            'place_id' => $place['place_id'] ?? null,
            'photo_reference_count' => count($references),
            'first_reference_length' => isset($references[0]) ? strlen((string) $references[0]) : 0,
            'first_reference_head' => isset($references[0]) ? substr((string) $references[0], 0, 40).'…' : null,
        ];

        if ($references === []) {
            $out['verdict'] = ($place['matched'] ?? false)
                ? 'Place matched but Google returned no photos, so the photo endpoint cannot be tested with this society. Try one you know has photos on Google Maps.'
                : 'Place did not match, so there is nothing to fetch. Check the name and location.';

            return response()->json($out);
        }

        // 3. The call that is failing — routed exactly as production routes it. The two
        //    API generations issue incompatible identifiers, so a diagnostic that always
        //    hit the legacy endpoint would be testing a path we no longer take and
        //    reporting its errors as though they were ours.
        $reference = (string) $references[0];
        $isNewApiName = str_starts_with($reference, 'places/');

        $url = $isNewApiName
            ? 'https://places.googleapis.com/v1/'.$reference.'/media'
            : 'https://maps.googleapis.com/maps/api/place/photo';
        $query = $isNewApiName
            ? ['maxWidthPx' => 640, 'skipHttpRedirect' => 'false', 'key' => $key]
            : ['maxwidth' => 640, 'photo_reference' => $reference, 'key' => $key];

        $out['api_generation'] = $isNewApiName ? 'places_api_new (v1)' : 'places_api_legacy';

        try {
            $response = Http::timeout(20)->get($url, $query);
            $body = (string) $response->body();
            $type = (string) $response->header('Content-Type');

            $out['photo'] = [
                'request_url' => $url.'?'.http_build_query(array_merge($query, ['key' => 'REDACTED'])),
                'status' => $response->status(),
                'content_type' => $type,
                'bytes' => strlen($body),
                'is_image' => str_starts_with(strtolower($type), 'image/'),
                // Google states the real reason in the body for quota/permission errors;
                // the HTML page is what a request rejected at the edge looks like.
                'body_head' => str_starts_with(strtolower($type), 'image/') ? null : substr(strip_tags($body), 0, 400),
            ];

            // A 403 that happens to carry an image/png body is still a 403. Checking the
            // content type before the status reported "WORKING" over a failing endpoint,
            // which is worse than no diagnostic at all.
            $served = $response->successful() && $out['photo']['is_image'];
            $out['photo']['is_image'] = $served;

            $out['verdict'] = match (true) {
                $served => 'Photo endpoint is WORKING. If the review queue still shows failures, the stored references are stale — re-harvest the society.',
                $response->status() === 403 => 'Google refused the photo call (403). Search and Details work on this key, so the key itself is live — the usual cause is the key\'s API restrictions not listing "Places API (New)", or billing not being active on that API. Google Cloud → Credentials → your key → API restrictions.',
                $response->status() === 400 => 'Google rejected the request (400). Compare request_url above with a reference that works; if the reference looks intact, the legacy Place Photos endpoint is no longer served for this project and we must move to the Places API (New) media endpoint.',
                default => 'Photo endpoint returned HTTP '.$response->status().'. See body_head.',
            };
        } catch (\Throwable $e) {
            $out['photo'] = ['error' => $e->getMessage()];
            $out['verdict'] = 'The photo request threw before Google answered: '.$e->getMessage();
        }

        $out['street_view'] = $this->streetViewCheck($place);

        return response()->json($out);
    }

    /**
     * Street View is a separate API with its own enablement, so it can be dead while
     * Places is healthy — and a refusal looks exactly like "nowhere has coverage" unless
     * Google's own status is reported.
     *
     * @param  array<string,mixed>  $place
     * @return array<string,mixed>
     */
    private function streetViewCheck(array $place): array
    {
        $latitude = $place['latitude'] ?? null;
        $longitude = $place['longitude'] ?? null;

        if ($latitude === null || $longitude === null) {
            return ['checked' => false, 'note' => 'The probe society has no coordinates, so Street View could not be tested.'];
        }

        $service = app(\App\Services\GoogleStreetViewService::class);
        $status = $service->coverageStatus((float) $latitude, (float) $longitude);

        return [
            'checked' => true,
            'status' => $status,
            'usable' => $status === 'OK',
            'note' => match (true) {
                $status === 'OK' => 'Street View has imagery at this location and the API is callable.',
                $service->statusIsConfigurationProblem($status) => 'Street View refused the call ('.$status.'). Enable "Street View Static API" in Google Cloud and add it to the key\'s API restrictions — it is a separate API from Places.',
                default => 'Street View is callable but has no imagery at this particular location. That is a fact about the place, not a configuration problem.',
            },
        ];
    }
}
