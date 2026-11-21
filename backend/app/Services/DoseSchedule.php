<?php

namespace App\Services;

use App\Models\Resident;
use App\Models\Vaccine;
use Carbon\Carbon;
use Illuminate\Support\Collection;

/**
 * Computes the next dose for each vaccine of a resident.
 * Status is calculated on the fly from dates, so it never goes stale.
 *
 *  upcoming : due date is more than 7 days away
 *  due      : due within 7 days, or already past the due date but still inside the grace period
 *  overdue  : due date + grace period has passed
 */
class DoseSchedule
{
    public const DUE_WINDOW_DAYS = 7;

    private static function daysBetween(Carbon $from, Carbon $to): int
    {
        return (int) round(($to->getTimestamp() - $from->getTimestamp()) / 86400);
    }

    /**
     * @param  Collection  $vaccines      all Vaccine models
     * @param  Collection  $vaccinations  NON-voided Vaccination models of this resident
     */
    public static function forResident(Resident $resident, Collection $vaccines, Collection $vaccinations, ?Carbon $today = null): array
    {
        $today = ($today ?? Carbon::today())->copy()->startOfDay();
        $birth = $resident->birth_date->copy()->startOfDay();
        $items = [];

        foreach ($vaccines as $vaccine) {
            /** @var Vaccine $vaccine */
            $doses = $vaccinations->where('vaccine_id', $vaccine->id)->sortBy('date_given')->values();
            $given = $doses->count();

            if ($given >= $vaccine->total_doses) {
                continue; // series completed
            }

            if ($given === 0) {
                if ($vaccine->max_age_days !== null && self::daysBetween($birth, $today) > $vaccine->max_age_days) {
                    continue; // too old to start this series
                }
                $due = $birth->copy()->addDays($vaccine->first_dose_min_age_days);
            } else {
                $due = $doses->last()->date_given->copy()->startOfDay()->addDays($vaccine->interval_days);
            }

            $graceEnd = $due->copy()->addDays($vaccine->grace_days);

            if ($today->gt($graceEnd)) {
                $status = 'overdue';
            } elseif (self::daysBetween($today, $due) <= self::DUE_WINDOW_DAYS) {
                $status = 'due';
            } else {
                $status = 'upcoming';
            }

            $items[] = [
                'vaccine_id' => $vaccine->id,
                'vaccine' => $vaccine->name,
                'dose_number' => $given + 1,
                'total_doses' => $vaccine->total_doses,
                'due_date' => $due->toDateString(),
                'status' => $status,
                'days_overdue' => $today->gt($due) ? self::daysBetween($due, $today) : 0,
            ];
        }

        return $items;
    }
}
