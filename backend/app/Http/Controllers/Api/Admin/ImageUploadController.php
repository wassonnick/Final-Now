<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ImageUploadController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'image' => 'required|image|mimes:jpg,jpeg,png,webp|max:5120',
            'folder' => 'nullable|string|max:80',
        ]);

        $folder = preg_replace('/[^a-z0-9\-\/]/i', '', $validated['folder'] ?? 'uploads');
        $disk = config('filesystems.uploads_disk', 'public');
        $path = $request->file('image')->store($folder, $disk);

        return response()->json([
            'status' => 'ok',
            'data' => [
                'path' => $path,
                'url' => Storage::disk($disk)->url($path),
            ],
        ], 201);
    }
}
