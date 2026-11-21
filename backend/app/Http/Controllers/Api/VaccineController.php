<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Vaccine;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class VaccineController extends Controller
{
    public function index(): JsonResponse
    {
        return response()->json(['data' => Vaccine::orderBy('name')->get()]);
    }

    private function rules(?int $id = null): array
    {
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('vaccines', 'name')->ignore($id)],
            'total_doses' => ['required', 'integer', 'min:1', 'max:10'],
            'first_dose_min_age_days' => ['required', 'integer', 'min:0'],
            'max_age_days' => ['nullable', 'integer', 'min:0'],
            'interval_days' => ['required', 'integer', 'min:0'],
            'grace_days' => ['required', 'integer', 'min:0'],
        ];
    }

    public function store(Request $request): JsonResponse
    {
        $vaccine = Vaccine::create($request->validate($this->rules()));
        Audit::log($request, 'create_vaccine', 'vaccine', $vaccine->id, $vaccine->name);

        return response()->json(['message' => 'Vaccine added.', 'vaccine' => $vaccine], 201);
    }

    public function update(Request $request, Vaccine $vaccine): JsonResponse
    {
        $vaccine->update($request->validate($this->rules($vaccine->id)));
        Audit::log($request, 'update_vaccine', 'vaccine', $vaccine->id, $vaccine->name);

        return response()->json(['message' => 'Vaccine updated.', 'vaccine' => $vaccine]);
    }
}
