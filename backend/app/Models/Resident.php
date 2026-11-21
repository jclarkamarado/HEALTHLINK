<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Resident extends Model
{
    protected $fillable = [
        'user_id', 'reference_no', 'first_name', 'middle_name', 'last_name',
        'birth_date', 'birth_date_estimated', 'sex', 'contact_number', 'address',
        'purok', 'barangay', 'status', 'identity_checked', 'identity_checked_by',
        'registered_by', 'consent_given', 'consent_by', 'consent_date',
        'privacy_notice_version',
    ];

    protected function casts(): array
    {
        return [
            'birth_date' => 'date',
            'consent_date' => 'date',
            'birth_date_estimated' => 'boolean',
            'identity_checked' => 'boolean',
            'consent_given' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function vaccinations(): HasMany
    {
        return $this->hasMany(Vaccination::class);
    }

    public static function generateReferenceNo(): string
    {
        $alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no look-alike characters
        do {
            $code = '';
            for ($i = 0; $i < 4; $i++) {
                $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
            }
            $ref = 'HL-'.date('Y').'-'.$code;
        } while (self::where('reference_no', $ref)->exists());

        return $ref;
    }

    public function toApi(): array
    {
        return [
            'id' => $this->id,
            'reference_no' => $this->reference_no,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'full_name' => trim($this->first_name.' '.($this->middle_name ? $this->middle_name.' ' : '').$this->last_name),
            'birth_date' => $this->birth_date?->toDateString(),
            'birth_date_estimated' => $this->birth_date_estimated,
            'sex' => $this->sex,
            'contact_number' => $this->contact_number,
            'address' => $this->address,
            'purok' => $this->purok,
            'barangay' => $this->barangay,
            'status' => $this->status,
            'has_portal_account' => $this->user_id !== null,
            'consent_given' => $this->consent_given,
        ];
    }
}
