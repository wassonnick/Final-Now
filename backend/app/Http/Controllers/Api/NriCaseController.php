<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\NriCase;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class NriCaseController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'country' => ['required', 'string', 'max:120'],
            'contact_method' => ['required', Rule::in(['email', 'whatsapp'])],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'service_type' => ['required', Rule::in(['buy', 'sell', 'rent_out', 'manage'])],
            'property_context' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:3000'],
            'consent' => ['accepted'],
        ]);

        $digits = preg_replace('/\D+/', '', (string) ($data['phone'] ?? ''));
        if ($data['contact_method'] === 'whatsapp' && (strlen($digits) < 7 || strlen($digits) > 15)) {
            return response()->json(['message' => 'Enter a valid international WhatsApp number including country code.'], 422);
        }
        if ($data['contact_method'] === 'email' && empty($data['email'])) {
            return response()->json(['message' => 'Email is required when email is your preferred contact method.'], 422);
        }

        unset($data['consent']);
        $case = NriCase::create($data + ['consent_at' => now()]);

        return response()->json([
            'message' => 'Your NRI consultation request was received. An admin will review it before contacting you.',
            'case_reference' => 'NRI-'.$case->id,
            'disclaimer' => 'SocietyFlats does not provide legal, tax, FEMA, banking or remittance advice. Independent professional verification may be required.',
        ], 201);
    }
}
