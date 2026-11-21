<?php

use App\Http\Controllers\Api\ActivityLogController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\FollowUpController;
use App\Http\Controllers\Api\MedicineController;
use App\Http\Controllers\Api\PortalController;
use App\Http\Controllers\Api\ResidentController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VaccinationController;
use App\Http\Controllers\Api\VaccineController;
use Illuminate\Support\Facades\Route;

// Public: login only (residents cannot self-register).
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Health worker + administrator
    Route::middleware('role:health_worker,admin')->group(function () {
        Route::get('/dashboard', [FollowUpController::class, 'dashboard']);
        Route::get('/follow-ups', [FollowUpController::class, 'index']);
        Route::post('/follow-ups', [FollowUpController::class, 'mark']);

        Route::get('/residents', [ResidentController::class, 'index']);
        Route::post('/residents', [ResidentController::class, 'store']);
        Route::get('/residents/{resident}', [ResidentController::class, 'show']);
        Route::put('/residents/{resident}', [ResidentController::class, 'update']);
        Route::post('/residents/{resident}/portal-account', [ResidentController::class, 'portalAccount']);
        Route::post('/residents/{resident}/vaccinations', [VaccinationController::class, 'store']);
        Route::post('/vaccinations/{vaccination}/void', [VaccinationController::class, 'void']);

        Route::get('/vaccines', [VaccineController::class, 'index']);

        Route::get('/medicines', [MedicineController::class, 'index']);
        Route::post('/medicines', [MedicineController::class, 'store']);
        Route::put('/medicines/{medicine}', [MedicineController::class, 'update']);
        Route::post('/medicines/{medicine}/stock', [MedicineController::class, 'adjust']);
        Route::get('/medicines/{medicine}/movements', [MedicineController::class, 'movements']);
    });

    // Administrator only
    Route::middleware('role:admin')->group(function () {
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::patch('/users/{user}/active', [UserController::class, 'setActive']);
        Route::post('/vaccines', [VaccineController::class, 'store']);
        Route::put('/vaccines/{vaccine}', [VaccineController::class, 'update']);
        Route::get('/activity-logs', [ActivityLogController::class, 'index']);
    });

    // Resident portal (own record only)
    Route::middleware('role:resident')->group(function () {
        Route::get('/portal/me', [PortalController::class, 'me']);
        Route::get('/portal/medicines', [MedicineController::class, 'available']);
    });
});
