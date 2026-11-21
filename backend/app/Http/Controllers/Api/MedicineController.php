<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Medicine;
use App\Models\StockMovement;
use App\Support\Audit;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class MedicineController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = Medicine::query();

        if ($s = strtolower(trim((string) $request->query('q', '')))) {
            $q->where(fn ($w) => $w->whereRaw('LOWER(name) LIKE ?', ["%$s%"])->orWhereRaw('LOWER(generic_name) LIKE ?', ["%$s%"]));
        }
        match ($request->query('status')) {
            'out_of_stock' => $q->where('quantity', '<=', 0),
            'low_stock' => $q->where('quantity', '>', 0)->whereColumn('quantity', '<=', 'reorder_level'),
            'in_stock' => $q->whereColumn('quantity', '>', 'reorder_level'),
            'expired' => $q->whereDate('expiry_date', '<', now()->toDateString()),
            'near_expiry' => $q->whereDate('expiry_date', '>=', now()->toDateString())
                ->whereDate('expiry_date', '<=', now()->addDays(60)->toDateString()),
            default => null,
        };

        $page = $q->orderBy('name')->paginate(min((int) $request->query('per_page', 10), 50));

        return response()->json([
            'data' => collect($page->items())->map->toApi(),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total(), 'per_page' => $page->perPage()],
        ]);
    }

    /** Resident view: no exact quantities, expired medicines hidden. */
    public function available(Request $request): JsonResponse
    {
        $q = Medicine::query()->where(fn ($w) => $w->whereNull('expiry_date')->orWhereDate('expiry_date', '>=', now()->toDateString()));

        if ($s = strtolower(trim((string) $request->query('q', '')))) {
            $q->where(fn ($w) => $w->whereRaw('LOWER(name) LIKE ?', ["%$s%"])->orWhereRaw('LOWER(generic_name) LIKE ?', ["%$s%"]));
        }

        return response()->json(['data' => $q->orderBy('name')->get()->map->toApi(true)]);
    }

    private function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'generic_name' => ['nullable', 'string', 'max:255'],
            'form_strength' => ['nullable', 'string', 'max:255'],
            'unit' => ['required', 'string', 'max:50'],
            'reorder_level' => ['required', 'integer', 'min:0'],
            'batch_number' => ['nullable', 'string', 'max:100'],
            'expiry_date' => ['nullable', 'date'],
        ];
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate($this->rules() + ['quantity' => ['required', 'integer', 'min:0']]);

        $medicine = DB::transaction(function () use ($data, $request) {
            $m = Medicine::create($data);
            if ($m->quantity > 0) {
                StockMovement::create(['medicine_id' => $m->id, 'type' => 'in', 'quantity' => $m->quantity, 'reason' => 'Initial stock', 'user_id' => $request->user()->id]);
            }

            return $m;
        });
        Audit::log($request, 'add_medicine', 'medicine', $medicine->id, $medicine->name);

        return response()->json(['message' => 'Medicine added.', 'medicine' => $medicine->toApi()], 201);
    }

    public function update(Request $request, Medicine $medicine): JsonResponse
    {
        $medicine->update($request->validate($this->rules()));
        Audit::log($request, 'update_medicine', 'medicine', $medicine->id, $medicine->name);

        return response()->json(['message' => 'Medicine updated.', 'medicine' => $medicine->toApi()]);
    }

    public function adjust(Request $request, Medicine $medicine): JsonResponse
    {
        $data = $request->validate([
            'type' => ['required', Rule::in(['in', 'out'])],
            'quantity' => ['required', 'integer', 'min:1'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $result = DB::transaction(function () use ($medicine, $data, $request) {
            $m = Medicine::whereKey($medicine->id)->lockForUpdate()->firstOrFail();

            if ($data['type'] === 'out' && $data['quantity'] > $m->quantity) {
                return null; // stock cannot go below zero
            }

            $m->quantity += $data['type'] === 'in' ? $data['quantity'] : -$data['quantity'];
            $m->save();
            StockMovement::create([
                'medicine_id' => $m->id, 'type' => $data['type'], 'quantity' => $data['quantity'],
                'reason' => $data['reason'] ?? null, 'user_id' => $request->user()->id,
            ]);

            return $m;
        });

        if ($result === null) {
            return response()->json(['message' => 'Stock cannot go below zero.', 'errors' => ['quantity' => ['Not enough stock.']]], 422);
        }

        Audit::log($request, 'stock_'.$data['type'], 'medicine', $medicine->id, $data['quantity'].' '.$medicine->unit);

        return response()->json(['message' => 'Stock updated.', 'medicine' => $result->toApi()]);
    }

    public function movements(Medicine $medicine): JsonResponse
    {
        $rows = StockMovement::where('medicine_id', $medicine->id)->latest()->limit(50)->get()
            ->map(fn ($r) => ['id' => $r->id, 'type' => $r->type, 'quantity' => $r->quantity, 'reason' => $r->reason, 'created_at' => $r->created_at->toDateTimeString()]);

        return response()->json(['data' => $rows]);
    }
}
