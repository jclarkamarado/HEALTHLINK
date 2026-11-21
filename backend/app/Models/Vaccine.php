<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Vaccine extends Model
{
    protected $fillable = [
        'name', 'total_doses', 'first_dose_min_age_days', 'max_age_days',
        'interval_days', 'grace_days',
    ];
}
