<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FollowUp;
use App\Models\Medicine;
use App\Models\Resident;
use App\Models\Vaccination;
use App\Models\Vaccine;
use App\Services\DoseSchedule;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FollowUpController extends Controller
{
    /** Build every due/overdue/upcoming dose for all active residents. */
    private function allItems(): array
    {
        $vaccines = Vaccine::all();
        $residents = Resident::where('status', 'active')->get();
        $byResident = Vaccination::whereNull('voided_at')->get()->groupBy('resident_id');

        $followUps = FollowUp::orderBy('id')->get()->keyBy(
            fn ($f) => $f->resident_id.'-'.$f->vaccine_id.'-'.$f->dose_number
        );

        $items = [];
        foreach ($residents as $resident) {
            $schedule = DoseSchedule::forResident($resident, $vaccines, $byResident->get($resident->id, collect()));
            foreach ($schedule as $row) {
                $fu = $followUps->get($resident->id.'-'.$row['vaccine_id'].'-'.$row['dose_number']);
                $items[] = $row + [
                    'resident_id' => $resident->id,
                    'reference_no' => $resident->reference_no,
                    'full_name' => $resident->toApi()['full_name'],
                    'birth_date' => $resident->birth_date->toDateString(),
                    'purok' => $resident->purok,
                    'contact_number' => $resident->contact_number,
                    'follow_up_status' => $fu?->status,
                    'follow_up_note' => $fu?->note,
                ];
            }
        }

        return $items;
    }

    public function dashboard(): JsonResponse
    {
        $items = collect($this->allItems());
        $medicines = Medicine::all();

        return response()->json([
            'residents_total' => Resident::count(),
            'residents_active' => Resident::where('status', 'active')->count(),
            'vaccinations_total' => Vaccination::whereNull('voided_at')->count(),
            'due_doses' => $items->where('status', 'due')->count(),
            'overdue_doses' => $items->where('status', 'overdue')->count(),
            'due_residents' => $items->where('status', 'due')->pluck('resident_id')->unique()->count(),
            'overdue_residents' => $items->where('status', 'overdue')->pluck('resident_id')->unique()->count(),
            'low_stock' => $medicines->filter(fn ($m) => ! $m->isExpired() && $m->stockStatus() !== 'in_stock')->count(),
            'near_expiry' => $medicines->filter(fn ($m) => $m->nearExpiry())->count(),
            'expired' => $medicines->filter(fn ($m) => $m->isExpired())->count(),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $items = collect($this->allItems());

        $status = $request->query('status', 'actionable');
        $items = match ($status) {
            'actionable' => $items->whereIn('status', ['due', 'overdue']),
            'all' => $items,
            default => $items->where('status', $status),
        };

        if ($v = $request->query('vaccine_id')) {
            $items = $items->where('vaccine_id', (int) $v);
        }
        if ($p = $request->query('purok')) {
            $items = $items->where('purok', $p);
        }
        if ($q = strtolower(trim((string) $request->query('q', '')))) {
            $items = $items->filter(fn ($i) => str_contains(strtolower($i['full_name']), $q) || str_contains(strtolower($i['reference_no']), $q));
        }
        if ($age = $request->query('age_group')) {
            $items = $items->filter(function ($i) use ($age) {
                $months = (int) floor(\Carbon\Carbon::parse($i['birth_date'])->diffInMonths(now(), true));

                return match ($age) {
                    'infant' => $months < 12,
                    'toddler' => $months >= 12 && $months < 60,
                    'child' => $months >= 60 && $months < 216,
                    'adult' => $months >= 216,
                    default => true,
                };
            });
        }

        $sort = $request->query('sort', 'due_date');
        $items = match ($sort) {
            'name' => $items->sortBy('full_name', SORT_NATURAL | SORT_FLAG_CASE),
            'days_overdue' => $items->sortByDesc('days_overdue'),
            default => $items->sortBy('due_date'),
        };
        $items = $items->values();

        $perPage = min(max((int) $request->query('per_page', 10), 1), 200);
        $page = max((int) $request->query('page', 1), 1);
        $total = $items->count();

        return response()->json([
            'data' => $items->slice(($page - 1) * $perPage, $perPage)->values(),
            'meta' => [
                'current_page' => $page,
                'last_page' => max((int) ceil($total / $perPage), 1),
                'total' => $total,
                'per_page' => $perPage,
            ],
        ]);
    }

    public function mark(Request $request): JsonResponse
    {
        $data = $request->validate([
            'resident_id' => ['required', 'exists:residents,id'],
            'vaccine_id' => ['required', 'exists:vaccines,id'],
            'dose_number' => ['required', 'integer', 'min:1'],
            'status' => ['required', Rule::in(['contacted', 'rescheduled', 'completed'])],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        FollowUp::create($data + ['user_id' => $request->user()->id]);
        Audit::log($request, 'follow_up_'.$data['status'], 'resident', (int) $data['resident_id']);

        return response()->json(['message' => 'Follow-up saved.'], 201);
    }
}
