<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\CampaignPage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class AdminCampaignPageController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['status' => 'ok', 'data' => CampaignPage::latest()->get()]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $slug = Str::slug($data['slug']);
        if ($slug === '' || CampaignPage::where('slug', $slug)->exists()) {
            return response()->json(['status' => 'error', 'message' => 'Slug is empty or already in use.'], 422);
        }

        $page = CampaignPage::create(['slug' => $slug, 'status' => CampaignPage::STATUS_DRAFT, 'payload' => $data['payload']]);

        return response()->json(['status' => 'ok', 'data' => $page], 201);
    }

    public function update(Request $request, CampaignPage $campaignPage): JsonResponse
    {
        $updates = [];
        if ($request->has('payload')) {
            $updates['payload'] = $this->validated($request)['payload'];
        }
        if ($request->filled('status')) {
            $updates['status'] = $request->validate(['status' => ['required', Rule::in([CampaignPage::STATUS_DRAFT, CampaignPage::STATUS_PUBLISHED])]])['status'];
        }
        $campaignPage->update($updates);

        return response()->json(['status' => 'ok', 'data' => $campaignPage->fresh()]);
    }

    public function destroy(CampaignPage $campaignPage): JsonResponse
    {
        $campaignPage->delete();

        return response()->json(['status' => 'ok']);
    }

    /** @return array{slug:string,payload:array<string,mixed>} */
    private function validated(Request $request): array
    {
        return $request->validate([
            'slug' => ['sometimes', 'string', 'max:80'],
            'payload' => ['required', 'array'],
            'payload.badge' => ['required', 'string', 'max:120'],
            'payload.titlePlain' => ['required', 'string', 'max:160'],
            'payload.titleGold' => ['required', 'string', 'max:160'],
            'payload.subtitle' => ['required', 'string', 'max:600'],
            'payload.bullets' => ['required', 'array', 'min:1', 'max:6'],
            'payload.bullets.*.title' => ['required', 'string', 'max:120'],
            'payload.bullets.*.text' => ['required', 'string', 'max:400'],
            'payload.steps' => ['required', 'array', 'min:1', 'max:5'],
            'payload.steps.*.title' => ['required', 'string', 'max:120'],
            'payload.steps.*.text' => ['required', 'string', 'max:400'],
            'payload.faq' => ['nullable', 'array', 'max:8'],
            'payload.faq.*.question' => ['required', 'string', 'max:200'],
            'payload.faq.*.answer' => ['required', 'string', 'max:600'],
            'payload.primaryCta' => ['required', 'array'],
            'payload.primaryCta.label' => ['required', 'string', 'max:60'],
            'payload.primaryCta.href' => ['required', 'string', 'max:200', 'starts_with:/'],
            'payload.whatsappText' => ['required', 'string', 'max:300'],
            'payload.leadSource' => ['required', 'string', 'max:80'],
            'payload.seo' => ['required', 'array'],
            'payload.seo.title' => ['required', 'string', 'max:200'],
            'payload.seo.description' => ['required', 'string', 'max:400'],
        ]);
    }
}
