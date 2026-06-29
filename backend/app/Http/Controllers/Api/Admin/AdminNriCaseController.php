<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\NriCase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AdminNriCaseController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = NriCase::query()->latest();
        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        return response()->json(['data' => $query->paginate($request->integer('per_page', 50))]);
    }

    public function update(Request $request, NriCase $nriCase): JsonResponse
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(['submitted', 'contacted', 'documents_pending', 'in_review', 'completed', 'closed'])],
            'assigned_to' => ['nullable', 'string', 'max:255'],
            'follow_up_at' => ['nullable', 'date'],
            'admin_notes' => ['nullable', 'string', 'max:5000'],
        ]);

        $nriCase->update($data);

        return response()->json(['message' => 'NRI case updated.', 'data' => $nriCase->fresh()]);
    }
}
