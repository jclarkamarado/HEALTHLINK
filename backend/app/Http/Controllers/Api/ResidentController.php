<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use App\Models\User;
use App\Models\Vaccine;
use App\Services\DoseSchedule;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class ResidentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Resident::query();

        if ($s = trim((string) $request->query('q', ''))) {
            $like = '%'.strtolower($s).'%';
            $query->where(function ($w) use ($like) {
                $w->whereRaw('LOWER(first_name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(middle_name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(last_name) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(reference_no) LIKE ?', [$like])
                    ->orWhereRaw("LOWER(CONCAT(first_name, ' ', last_name)) LIKE ?", [$like]);
            });
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($purok = $request->query('purok')) {
            $query->where('purok', $purok);
        }

        $sort = $request->query('sort', 'name');
        $sort === 'newest'
            ? $query->orderByDesc('id')
            : $query->orderBy('last_name')->orderBy('first_name');

        $page = $query->paginate(min((int) $request->query('per_page', 10), 50));

        Audit::log($request, 'search_residents', null, null, $s ?: null);

        return response()->json([
            'data' => collect($page->items())->map->toApi(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'total' => $page->total(),
                'per_page' => $page->perPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['required', 'string', 'max:255'],
            'birth_date' => ['required', 'date', 'before_or_equal:today'],
            'birth_date_estimated' => ['boolean'],
            'sex' => ['required', Rule::in(['male', 'female'])],
            'contact_number' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'purok' => ['nullable', 'string', 'max:100'],
            'barangay' => ['nullable', 'string', 'max:100'],
            'identity_checked' => ['required', 'accepted'],
            'consent_given' => ['required', 'accepted'],
            'consent_by' => ['required', 'string', 'max:255'],
            'privacy_notice_version' => ['nullable', 'string', 'max:50'],
            'confirm_new' => ['boolean'], // worker confirmed "different person"
        ]);

        // Duplicate warning (does not block: the worker confirms).
        if (! $request->boolean('confirm_new')) {
            $matches = Resident::whereRaw('LOWER(last_name) = ?', [strtolower($data['last_name'])])
                ->where(function ($w) use ($data) {
                    $w->whereRaw('LOWER(first_name) = ?', [strtolower($data['first_name'])])
                        ->orWhereDate('birth_date', $data['birth_date']);
                })
                ->limit(5)->get();

            if ($matches->isNotEmpty()) {
                return response()->json([
                    'message' => 'Possible duplicate resident found.',
                    'possible_matches' => $matches->map->toApi(),
                ], 409);
            }
        }

        $resident = Resident::create([
            'reference_no' => Resident::generateReferenceNo(),
            'first_name' => $data['first_name'],
            'middle_name' => $data['middle_name'] ?? null,
            'last_name' => $data['last_name'],
            'birth_date' => $data['birth_date'],
            'birth_date_estimated' => $request->boolean('birth_date_estimated'),
            'sex' => $data['sex'],
            'contact_number' => $data['contact_number'] ?? null,
            'address' => $data['address'] ?? null,
            'purok' => $data['purok'] ?? null,
            'barangay' => $data['barangay'] ?? null,
            'status' => 'active',
            'identity_checked' => true,
            'identity_checked_by' => $request->user()->id,
            'registered_by' => $request->user()->id,
            'consent_given' => true,
            'consent_by' => $data['consent_by'],
            'consent_date' => now()->toDateString(),
            'privacy_notice_version' => $data['privacy_notice_version'] ?? 'v1',
        ]);

        Audit::log($request, 'register_resident', 'resident', $resident->id, $resident->reference_no);

        return response()->json(['message' => 'Resident registered.', 'resident' => $resident->toApi()], 201);
    }

    public function show(Request $request, Resident $resident): JsonResponse
    {
        $resident->load(['vaccinations.vaccine', 'vaccinations.giver']);
        $valid = $resident->vaccinations->whereNull('voided_at');

        Audit::log($request, 'view_resident', 'resident', $resident->id, $resident->reference_no);

        return response()->json([
            'resident' => $resident->toApi(),
            'vaccinations' => $resident->vaccinations->sortByDesc('date_given')->values()->map->toApi(),
            'schedule' => $resident->status === 'active'
                ? DoseSchedule::forResident($resident, Vaccine::all(), $valid)
                : [],
        ]);
    }

    public function update(Request $request, Resident $resident): JsonResponse
    {
        $data = $request->validate([
            'first_name' => ['sometimes', 'required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name' => ['sometimes', 'required', 'string', 'max:255'],
            'birth_date' => ['sometimes', 'required', 'date', 'before_or_equal:today'],
            'birth_date_estimated' => ['boolean'],
            'sex' => ['sometimes', 'required', Rule::in(['male', 'female'])],
            'contact_number' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'purok' => ['nullable', 'string', 'max:100'],
            'barangay' => ['nullable', 'string', 'max:100'],
            'status' => ['sometimes', Rule::in(['active', 'transferred', 'inactive', 'deceased'])],
        ]);

        $changed = array_keys(array_diff_assoc(
            collect($data)->map(fn ($v) => (string) $v)->all(),
            collect($resident->only(array_keys($data)))->map(fn ($v) => $v instanceof \DateTimeInterface ? $v->format('Y-m-d') : (string) $v)->all()
        ));

        $resident->update($data);
        Audit::log($request, 'update_resident', 'resident', $resident->id, $changed ? 'changed: '.implode(', ', $changed) : null);

        return response()->json(['message' => 'Resident updated.', 'resident' => $resident->fresh()->toApi()]);
    }

    /**
     * Simplified activation: the health worker verifies the person and sets a
     * temporary password for the resident portal. Login username = reference number.
     */
    public function portalAccount(Request $request, Resident $resident): JsonResponse
    {
        $data = $request->validate([
            'password' => ['required', 'string', Password::min(8)],
        ]);

        if ($resident->user_id) {
            $resident->user->update(['password' => $data['password']]);
            Audit::log($request, 'reset_portal_password', 'resident', $resident->id);

            return response()->json(['message' => 'Portal password was reset.']);
        }

        $user = User::create([
            'first_name' => $resident->first_name,
            'middle_name' => $resident->middle_name,
            'last_name' => $resident->last_name,
            'username' => $resident->reference_no,
            'role' => User::ROLE_RESIDENT,
            'is_active' => true,
            'password' => $data['password'],
        ]);
        $resident->update(['user_id' => $user->id]);
        Audit::log($request, 'create_portal_account', 'resident', $resident->id);

        return response()->json([
            'message' => 'Portal account created. Username is the reference number.',
            'username' => $resident->reference_no,
        ], 201);
    }
}
