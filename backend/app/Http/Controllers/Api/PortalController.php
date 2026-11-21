<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use App\Models\Vaccine;
use App\Services\DoseSchedule;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Read-only view for a logged-in resident (own record only). */
class PortalController extends Controller
{
    public function me(Request $request): JsonResponse
    {
        $resident = Resident::where('user_id', $request->user()->id)->first();

        if (! $resident) {
            return response()->json(['message' => 'No resident profile is linked to this account.'], 404);
        }

        $resident->load(['vaccinations' => fn ($q) => $q->whereNull('voided_at')->orderByDesc('date_given'), 'vaccinations.vaccine']);
        Audit::log($request, 'view_own_record', 'resident', $resident->id);

        return response()->json([
            'resident' => $resident->toApi(),
            'vaccinations' => $resident->vaccinations->map->toApi()->values(),
            'schedule' => $resident->status === 'active'
                ? DoseSchedule::forResident($resident, Vaccine::all(), $resident->vaccinations)
                : [],
        ]);
    }
}
