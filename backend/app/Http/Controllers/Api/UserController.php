<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/** Administrator: create and (de)activate health worker accounts. */
class UserController extends Controller
{
    public function index(): JsonResponse
    {
        $users = User::whereIn('role', [User::ROLE_WORKER, User::ROLE_ADMIN])
            ->orderBy('last_name')->get()->map->toApi();

        return response()->json(['data' => $users]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'username' => ['required', 'string', 'max:255', 'alpha_dash', Rule::unique('users', 'username')],
            'email' => ['nullable', 'email', 'max:255', Rule::unique('users', 'email')],
            'password' => ['required', 'string', Password::min(8), 'confirmed'],
        ]);

        $user = User::create($data + ['role' => User::ROLE_WORKER, 'is_active' => true]);
        Audit::log($request, 'create_health_worker', 'user', $user->id);

        return response()->json(['message' => 'Health worker account created.', 'user' => $user->toApi()], 201);
    }

    public function setActive(Request $request, User $user): JsonResponse
    {
        $data = $request->validate(['is_active' => ['required', 'boolean']]);

        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot deactivate your own account.'], 422);
        }

        $user->update(['is_active' => $data['is_active']]);
        if (! $data['is_active']) {
            $user->tokens()->delete();
        }
        Audit::log($request, $data['is_active'] ? 'activate_user' : 'deactivate_user', 'user', $user->id);

        return response()->json(['message' => 'Account updated.', 'user' => $user->toApi()]);
    }
}
