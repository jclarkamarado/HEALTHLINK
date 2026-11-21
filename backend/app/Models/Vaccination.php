<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Vaccination extends Model
{
    protected $fillable = [
        'resident_id', 'vaccine_id', 'dose_number', 'date_given', 'batch_number',
        'given_by', 'voided_at', 'void_reason', 'voided_by',
    ];

    protected function casts(): array
    {
        return [
            'date_given' => 'date',
            'voided_at' => 'datetime',
        ];
    }

    public function vaccine(): BelongsTo
    {
        return $this->belongsTo(Vaccine::class);
    }

    public function giver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'given_by');
    }

    public function toApi(): array
    {
        return [
            'id' => $this->id,
            'resident_id' => $this->resident_id,
            'vaccine_id' => $this->vaccine_id,
            'vaccine' => $this->vaccine?->name,
            'dose_number' => $this->dose_number,
            'date_given' => $this->date_given?->toDateString(),
            'batch_number' => $this->batch_number,
            'given_by' => $this->giver ? trim($this->giver->first_name.' '.$this->giver->last_name) : null,
            'voided' => $this->voided_at !== null,
            'void_reason' => $this->void_reason,
        ];
    }
}
