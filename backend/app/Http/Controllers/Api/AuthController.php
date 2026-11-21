<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public const TOKEN_MINUTES = 120;

    public function login(Request $request): JsonResponse
    {
        $data = $request->validate([
            'username' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
        ]);

        $user = User::whereRaw('LOWER(username) = ?', [strtolower(trim($data['username']))])->first();

        // Same generic message for every failure so account existence is not revealed.
        if (! $user || ! $user->is_active || ! Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Details do not match.'], 422);
        }

        $token = $user->createToken('hl-token', ['*'], now()->addMinutes(self::TOKEN_MINUTES))->plainTextToken;

        $request->setUserResolver(fn () => $user);
        Audit::log($request, 'login', 'user', $user->id);

        return response()->json([
            'token' => $token,
            'expires_in_minutes' => self::TOKEN_MINUTES,
            'user' => $user->toApi(),
        ]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json(['user' => $request->user()->toApi()]);
    }

    public function logout(Request $request): JsonResponse
    {
        Audit::log($request, 'logout', 'user', $request->user()->id);
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }
}
