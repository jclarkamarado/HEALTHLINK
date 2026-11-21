<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    protected $fillable = ['medicine_id', 'type', 'quantity', 'reason', 'user_id'];
}
