<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Medicine extends Model
{
    protected $fillable = [
        'name', 'generic_name', 'form_strength', 'quantity', 'unit',
        'reorder_level', 'batch_number', 'expiry_date',
    ];

    protected function casts(): array
    {
        return ['expiry_date' => 'date'];
    }

    public function isExpired(): bool
    {
        return $this->expiry_date !== null && $this->expiry_date->lt(now()->startOfDay());
    }

    public function stockStatus(): string
    {
        if ($this->quantity <= 0) {
            return 'out_of_stock';
        }

        return $this->quantity <= $this->reorder_level ? 'low_stock' : 'in_stock';
    }

    public function nearExpiry(int $days = 60): bool
    {
        return $this->expiry_date !== null
            && ! $this->isExpired()
            && $this->expiry_date->lte(now()->startOfDay()->addDays($days));
    }

    public function toApi(bool $forResident = false): array
    {
        $data = [
            'id' => $this->id,
            'name' => $this->name,
            'generic_name' => $this->generic_name,
            'form_strength' => $this->form_strength,
            'unit' => $this->unit,
            'status' => $this->stockStatus(),
            'expiry_date' => $this->expiry_date?->toDateString(),
        ];

        if (! $forResident) {
            $data += [
                'quantity' => $this->quantity,
                'reorder_level' => $this->reorder_level,
                'batch_number' => $this->batch_number,
                'expired' => $this->isExpired(),
                'near_expiry' => $this->nearExpiry(),
            ];
        }

        return $data;
    }
}
