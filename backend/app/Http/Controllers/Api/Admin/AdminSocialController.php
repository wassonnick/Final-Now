<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\SocialAccount;
use App\Models\SocialPost;
use App\Models\SocialPostAsset;
use App\Services\Social\SocialContextService;
use App\Services\Social\SocialDraftGeneratorService;
use App\Services\Social\SocialImageAssetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminSocialController extends Controller
{
    public function __construct(
        private SocialContextService $context,
        private SocialDraftGeneratorService $generator,
        private SocialImageAssetService $images,
    ) {}

    public function context(Request $request): JsonResponse
    {
        return response()->json(['status' => 'ok', 'data' => $this->context->build()]);
    }

    public function generate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'platforms' => ['required', 'array', 'min:1'],
            'platforms.*' => ['required', Rule::in(['instagram', 'facebook', 'linkedin', 'whatsapp', 'google_business'])],
            'content_pillar' => ['required', 'string', 'max:120'],
            'objective' => ['required', 'string', 'max:140'],
            'target_audience' => ['required', 'string', 'max:140'],
            'society_id' => ['nullable', 'integer'],
            'property_id' => ['nullable', 'integer'],
            'sector' => ['nullable', 'string', 'max:120'],
            'number_of_variations' => ['required', 'integer', 'min:1', 'max:10'],
            'generate_images' => ['nullable', 'boolean'],
            'image_style' => ['nullable', Rule::in(['premium_real_estate', 'clean_corporate', 'instagram_carousel', 'whatsapp_status', 'google_business', 'minimal_vector', 'local_area_guide'])],
        ]);

        try {
            $result = $this->generator->generate($data + ['generate_images' => (bool) ($data['generate_images'] ?? false)]);

            return response()->json([
                'status' => 'ok',
                'message' => 'AI social drafts saved for admin review. Nothing was published.',
                'data' => ['posts' => $result['posts']],
            ], 201);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    public function posts(Request $request): JsonResponse
    {
        $query = SocialPost::query()->with('assets');
        foreach (['status', 'platform', 'risk_level'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->input($filter));
            }
        }

        return response()->json(['status' => 'ok', 'data' => $query->latest()->paginate(min($request->integer('per_page', 50), 100))]);
    }

    public function showPost(SocialPost $post): JsonResponse
    {
        return response()->json(['status' => 'ok', 'data' => $post->load('assets')]);
    }

    public function updatePost(Request $request, SocialPost $post): JsonResponse
    {
        $data = $request->validate([
            'title' => ['sometimes', 'nullable', 'string', 'max:255'],
            'hook' => ['sometimes', 'nullable', 'string', 'max:3000'],
            'caption' => ['sometimes', 'required', 'string', 'max:12000'],
            'cta' => ['sometimes', 'nullable', 'string', 'max:255'],
            'hashtags' => ['sometimes', 'nullable', 'array'],
            'hashtags.*' => ['string', 'max:80'],
            'creative_prompt' => ['sometimes', 'nullable', 'string', 'max:12000'],
            'image_prompt' => ['sometimes', 'nullable', 'string', 'max:12000'],
            'image_style' => ['sometimes', 'nullable', Rule::in(['premium_real_estate', 'clean_corporate', 'instagram_carousel', 'whatsapp_status', 'google_business', 'minimal_vector', 'local_area_guide'])],
            'carousel_slides' => ['sometimes', 'nullable', 'array'],
            'reel_script' => ['sometimes', 'nullable', 'string', 'max:12000'],
            'risk_level' => ['sometimes', Rule::in(['low', 'medium', 'high'])],
            'status' => ['sometimes', Rule::in(['draft', 'needs_approval', 'approved', 'rejected'])],
            'scheduled_at' => ['sometimes', 'nullable', 'date'],
        ]);

        $post->update($data);

        return response()->json(['status' => 'ok', 'message' => 'Social draft updated. Nothing was posted.', 'data' => $post->fresh()->load('assets')]);
    }

    public function approvePost(SocialPost $post): JsonResponse
    {
        $post->update(['status' => 'approved']);

        return response()->json(['status' => 'ok', 'message' => 'Social draft approved for future manual/scheduled workflow.', 'data' => $post->fresh()->load('assets')]);
    }

    public function rejectPost(SocialPost $post): JsonResponse
    {
        $post->update(['status' => 'rejected']);

        return response()->json(['status' => 'ok', 'message' => 'Social draft rejected. Nothing was posted.', 'data' => $post->fresh()->load('assets')]);
    }

    public function generateImage(SocialPost $post): JsonResponse
    {
        $asset = $this->images->createForPost($post);

        return response()->json(['status' => 'ok', 'message' => 'Image asset or creative brief generated for review. Nothing was published.', 'data' => $asset], 201);
    }

    public function assets(Request $request): JsonResponse
    {
        $query = SocialPostAsset::query()->with('post:id,platform,post_type,title,hook,status,risk_level');
        foreach (['status', 'platform', 'risk_level', 'asset_type'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->input($filter));
            }
        }

        return response()->json(['status' => 'ok', 'data' => $query->latest()->paginate(min($request->integer('per_page', 50), 100))]);
    }

    public function updateAsset(Request $request, SocialPostAsset $asset): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(['needs_approval', 'approved', 'rejected'])],
            'image_prompt' => ['sometimes', 'nullable', 'string', 'max:12000'],
            'metadata' => ['sometimes', 'nullable', 'array'],
        ]);
        $asset->update($data);

        return response()->json(['status' => 'ok', 'message' => 'Social asset updated. Nothing was posted.', 'data' => $asset->fresh()->load('post:id,title,platform,status')]);
    }

    public function approveAsset(SocialPostAsset $asset): JsonResponse
    {
        $asset->update(['status' => 'approved']);

        return response()->json(['status' => 'ok', 'message' => 'Social asset approved for future workflow.', 'data' => $asset->fresh()]);
    }

    public function rejectAsset(SocialPostAsset $asset): JsonResponse
    {
        $asset->update(['status' => 'rejected']);

        return response()->json(['status' => 'ok', 'message' => 'Social asset rejected.', 'data' => $asset->fresh()]);
    }

    public function accounts(): JsonResponse
    {
        $platforms = [
            'instagram_business' => 'Instagram Business',
            'facebook_page' => 'Facebook Page',
            'linkedin' => 'LinkedIn Page/Profile',
            'google_business_profile' => 'Google Business Profile',
            'whatsapp_business' => 'WhatsApp Business',
        ];

        foreach ($platforms as $platform => $label) {
            SocialAccount::firstOrCreate(
                ['platform' => $platform],
                ['account_name' => $label, 'status' => 'not_connected', 'metadata' => ['sm1a_placeholder' => true]]
            );
        }

        $accounts = SocialAccount::query()
            ->select(['id', 'platform', 'account_name', 'account_handle', 'status', 'token_expires_at', 'scopes', 'created_at', 'updated_at'])
            ->orderBy('id')
            ->get();

        return response()->json(['status' => 'ok', 'data' => $accounts]);
    }
}
