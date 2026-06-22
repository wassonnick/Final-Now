<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\RentHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminRentHistoryController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        return response()->json(RentHistory::query()->with('society:id,name,slug')->when($request->filled('society_id'), fn ($q) => $q->where('society_id', $request->integer('society_id')))->latest('recorded_on')->paginate(min(100, max(1, $request->integer('per_page', 25)))));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $this->validated($request);
        $row = RentHistory::updateOrCreate(['society_id' => $data['society_id'], 'recorded_on' => $data['recorded_on'], 'bhk' => $data['bhk'] ?? null], $data);

        return response()->json(['message' => $row->wasRecentlyCreated ? 'Rent evidence added.' : 'Rent evidence updated.', 'data' => $row->load('society:id,name,slug')], $row->wasRecentlyCreated ? 201 : 200);
    }

    public function update(Request $request, RentHistory $rentHistory): JsonResponse
    {
        $rentHistory->update($this->validated($request, true));

        return response()->json(['message' => 'Rent evidence updated.', 'data' => $rentHistory->fresh('society:id,name,slug')]);
    }

    public function destroy(RentHistory $rentHistory): JsonResponse
    {
        $rentHistory->delete();

        return response()->json(['message' => 'Rent evidence deleted.']);
    }

    private function validated(Request $request, bool $partial = false): array
    {
        $p = $partial ? 'sometimes' : 'required';

        return $request->validate(['society_id' => [$p, 'integer', 'exists:societies,id'], 'recorded_on' => [$p, 'date'], 'bhk' => ['nullable', 'integer', 'min:1', 'max:10'], 'min_rent' => ['nullable', 'integer', 'min:1'], 'median_rent' => [$p, 'integer', 'min:1'], 'max_rent' => ['nullable', 'integer', 'min:1'], 'sample_size' => ['nullable', 'integer', 'min:1'], 'source_name' => [$p, 'string', 'max:255'], 'source_url' => ['nullable', 'url', 'max:2000'], 'confidence_score' => ['nullable', 'integer', 'min:0', 'max:100'], 'status' => [$p, 'in:draft,verified,rejected'], 'notes' => ['nullable', 'string', 'max:3000']]);
    }
}
