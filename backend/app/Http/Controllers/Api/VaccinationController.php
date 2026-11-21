<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Resident;
use App\Models\Vaccination;
use App\Models\Vaccine;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class VaccinationController extends Controller
{
    public function store(Request $request, Resident $resident): JsonResponse
    {
        $data = $request->validate([
            'vaccine_id' => ['required', 'exists:vaccines,id'],
            'date_given' => ['required', 'date', 'before_or_equal:today', 'after_or_equal:'.$resident->birth_date->toDateString()],
            'batch_number' => ['nullable', 'string', 'max:100'],
        ]);

        if ($resident->status !== 'active') {
            return response()->json(['message' => 'Only active residents can receive new records.'], 422);
        }

        $vaccine = Vaccine::findOrFail($data['vaccine_id']);

        $result = DB::transaction(function () use ($resident, $vaccine, $data, $request) {
            $valid = Vaccination::where('resident_id', $resident->id)
                ->where('vaccine_id', $vaccine->id)
                ->whereNull('voided_at')
                ->lockForUpdate()
                ->orderBy('date_given')->get();

            if ($valid->count() >= $vaccine->total_doses) {
                return ['error' => 'All doses of this vaccine are already recorded.'];
            }
            if ($valid->isNotEmpty() && $data['date_given'] < $valid->last()->date_given->toDateString()) {
                return ['error' => 'Date is earlier than the previous dose of this vaccine.'];
            }

            $record = Vaccination::create([
                'resident_id' => $resident->id,
                'vaccine_id' => $vaccine->id,
                'dose_number' => $valid->count() + 1,
                'date_given' => $data['date_given'],
                'batch_number' => $data['batch_number'] ?? null,
                'given_by' => $request->user()->id,
            ]);

            return ['record' => $record];
        });

        if (isset($result['error'])) {
            return response()->json(['message' => $result['error']], 422);
        }

        $record = $result['record'];
        Audit::log($request, 'record_vaccination', 'resident', $resident->id, $vaccine->name.' dose '.$record->dose_number);

        return response()->json([
            'message' => 'Vaccination recorded.',
            'vaccination' => $record->load(['vaccine', 'giver'])->toApi(),
        ], 201);
    }

    /** Correct a record by voiding it with a reason (never delete). */
    public function void(Request $request, Vaccination $vaccination): JsonResponse
    {
        $data = $request->validate(['reason' => ['required', 'string', 'min:3', 'max:255']]);

        if ($vaccination->voided_at) {
            return response()->json(['message' => 'This record is already voided.'], 422);
        }

        $vaccination->update([
            'voided_at' => now(),
            'void_reason' => $data['reason'],
            'voided_by' => $request->user()->id,
        ]);
        Audit::log($request, 'void_vaccination', 'resident', $vaccination->resident_id, 'record #'.$vaccination->id.': '.$data['reason']);

        return response()->json(['message' => 'Record voided.', 'vaccination' => $vaccination->load(['vaccine', 'giver'])->toApi()]);
    }
}
