<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Account;
use App\Models\Society;
use App\Models\SocietyImageContribution;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Contribution intake: residents, owners, RWAs and builders sending us a photograph of
 * their own society, with the permission to publish it attached.
 */
class SocietyImageContributionController extends Controller
{
    /** The wording each role is asked to agree to, for rendering the upload form. */
    public function roles(): JsonResponse
    {
        return response()->json([
            'roles' => collect(SocietyImageContribution::ROLES)
                // Staff uploads go through the admin surface, not the public form.
                ->except('staff')
                ->map(fn ($statement, $role) => ['role' => $role, 'statement' => $statement])
                ->values(),
        ]);
    }

    public function store(Request $request, string $idOrSlug): JsonResponse
    {
        $society = Society::where('slug', $idOrSlug)->orWhere('id', (int) $idOrSlug)->first();

        if (! $society) {
            return response()->json(['message' => 'Society not found.'], 404);
        }

        $data = $request->validate([
            'image' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:8192'],
            'contributor_role' => ['required', 'in:resident,owner,rwa,builder'],
            'contributor_name' => ['required', 'string', 'max:120'],
            'contributor_email' => ['nullable', 'email', 'max:160'],
            'contributor_phone' => ['nullable', 'string', 'max:30'],
            'caption' => ['nullable', 'string', 'max:160'],
            // Not a checkbox we can default to true: without it there is no grant, and
            // without a grant the image must never reach the public site.
            'rights_granted' => ['required', 'accepted'],
        ]);

        $account = $this->accountFromToken($request);

        $disk = config('filesystems.uploads_disk', 'public');
        $path = $request->file('image')->store('society-contributions/'.now()->format('Y/m'), $disk);

        [$width, $height] = $this->dimensions($request->file('image')->getRealPath());

        $contribution = SocietyImageContribution::create([
            'society_id' => $society->id,
            'account_id' => $account?->id,
            'contributor_role' => $data['contributor_role'],
            'contributor_name' => $data['contributor_name'],
            'contributor_email' => $data['contributor_email'] ?? $account?->email,
            'contributor_phone' => $data['contributor_phone'] ?? null,
            'image_path' => $path,
            'caption' => $data['caption'] ?? null,
            'width' => $width,
            'height' => $height,
            'rights_granted' => true,
            // Store the exact wording agreed to, not a reference to it.
            'rights_statement' => SocietyImageContribution::ROLES[$data['contributor_role']],
            'rights_granted_at' => now(),
            'status' => 'pending',
        ]);

        return response()->json([
            'status' => 'ok',
            'message' => 'Thank you — your photo is with our team for review. Nothing appears on the site until it is approved.',
            'contribution' => $contribution->only(['id', 'status', 'caption', 'created_at']) + ['image_url' => $contribution->image_url],
        ], 201);
    }

    /** What this account has sent us, so a contributor can see where it got to. */
    public function mine(Request $request): JsonResponse
    {
        $account = $this->accountFromToken($request);

        if (! $account) {
            return response()->json(['message' => 'Login required.'], 401);
        }

        return response()->json([
            'contributions' => SocietyImageContribution::with('society:id,name,slug')
                ->where('account_id', $account->id)
                ->latest()
                ->limit(50)
                ->get(),
        ]);
    }

    /** @return array{0:int,1:int} */
    private function dimensions(string $path): array
    {
        $size = @getimagesize($path);

        return [(int) ($size[0] ?? 0), (int) ($size[1] ?? 0)];
    }

    private function accountFromToken(Request $request): ?Account
    {
        $token = trim((string) preg_replace('/^Bearer\s+/i', '', (string) $request->header('Authorization', '')));

        if ($token === '' || strlen($token) < 40) {
            return null;
        }

        return Account::where('api_token_hash', hash('sha256', $token))->first();
    }
}
