<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'first_name' => 'required|string|max:100',
            'last_name' => 'required|string|max:100',
            'email' => 'required|email|unique:users',
            'phone' => 'required|string|unique:users',
            'password' => 'required|string|min:8',
            'user_type' => 'required|in:tenant,owner,broker',
        ]);

        $validated['password_hash'] = Hash::make($validated['password']);
        unset($validated['password']);

        $user = User::create($validated);
        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password_hash)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid credentials'],
            ]);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function sendOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => 'required|string',
        ]);

        // Generate and send OTP (implementation depends on SMS provider)
        $otp = rand(100000, 999999);

        // Store OTP in cache with 5-minute expiry
        cache()->put('otp_' . $validated['phone'], $otp, 300);

        return response()->json([
            'message' => 'OTP sent successfully',
            'otp' => config('app.debug') ? $otp : null, // Only return OTP in debug mode
        ]);
    }

    public function verifyOtp(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'phone' => 'required|string',
            'otp' => 'required|string',
        ]);

        $cachedOtp = cache()->get('otp_' . $validated['phone']);

        if ($cachedOtp != $validated['otp']) {
            return response()->json([
                'message' => 'Invalid OTP',
            ], 422);
        }

        // Find or create user
        $user = User::firstOrCreate(
            ['phone' => $validated['phone']],
            [
                'first_name' => 'User',
                'last_name' => '',
                'user_type' => 'tenant',
            ]
        );

        $token = $user->createToken('auth_token')->plainTextToken;

        // Clear OTP
        cache()->forget('otp_' . $validated['phone']);

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function user(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }
}
