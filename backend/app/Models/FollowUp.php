<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class FollowUp extends Model
{
    protected $fillable = ['resident_id', 'vaccine_id', 'dose_number', 'status', 'note', 'user_id'];
}
