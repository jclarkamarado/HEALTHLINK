<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $q = ActivityLog::with('user')->latest('id');

        if ($a = $request->query('action')) {
            $q->where('action', $a);
        }

        $page = $q->paginate(min((int) $request->query('per_page', 20), 100));

        return response()->json([
            'data' => collect($page->items())->map(fn ($l) => [
                'id' => $l->id,
                'user' => $l->user ? trim($l->user->first_name.' '.$l->user->last_name).' ('.$l->user->role.')' : 'system',
                'action' => $l->action,
                'subject' => $l->subject_type ? $l->subject_type.' #'.$l->subject_id : null,
                'description' => $l->description,
                'ip_address' => $l->ip_address,
                'created_at' => $l->created_at->toDateTimeString(),
            ]),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total(), 'per_page' => $page->perPage()],
        ]);
    }
}
