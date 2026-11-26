<?php

namespace Database\Seeders;

use App\Models\Medicine;
use App\Models\Resident;
use App\Models\User;
use App\Models\Vaccination;
use App\Models\Vaccine;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $today = Carbon::today();

        // ---- Accounts: one per role (admin, health worker, resident) ----
        $this->call(RoleUserSeeder::class);
        $worker = User::where('username', 'worker1')->firstOrFail();

        // ---- Vaccines: PLACEHOLDER schedule values for demo only.
        // Replace with the official schedule from your health center / DOH EPI.
        $vaccines = collect([
            ['name' => 'BCG', 'total_doses' => 1, 'first_dose_min_age_days' => 0, 'max_age_days' => 365, 'interval_days' => 0, 'grace_days' => 30],
            ['name' => 'Pentavalent', 'total_doses' => 3, 'first_dose_min_age_days' => 42, 'max_age_days' => 730, 'interval_days' => 28, 'grace_days' => 7],
            ['name' => 'OPV', 'total_doses' => 3, 'first_dose_min_age_days' => 42, 'max_age_days' => 730, 'interval_days' => 28, 'grace_days' => 7],
            ['name' => 'MMR', 'total_doses' => 2, 'first_dose_min_age_days' => 270, 'max_age_days' => 1825, 'interval_days' => 90, 'grace_days' => 14],
        ])->mapWithKeys(fn ($v) => [$v['name'] => Vaccine::create($v)]);

        // ---- Demo residents (dates are relative to today so statuses always show) ----
        $make = function (string $first, string $last, int $ageDays, string $sex, string $purok) use ($worker) {
            return Resident::create([
                'reference_no' => Resident::generateReferenceNo(),
                'first_name' => $first, 'last_name' => $last,
                'birth_date' => Carbon::today()->subDays($ageDays),
                'sex' => $sex, 'purok' => $purok, 'barangay' => 'Apokon',
                'address' => $purok.', Apokon, Tagum City', 'contact_number' => '09123456789',
                'status' => 'active', 'identity_checked' => true, 'identity_checked_by' => $worker->id,
                'registered_by' => $worker->id, 'consent_given' => true, 'consent_by' => 'Parent/Guardian',
                'consent_date' => Carbon::today(), 'privacy_notice_version' => 'v1',
            ]);
        };
        $give = function (Resident $r, string $vaccine, int $daysAgo) use ($vaccines, $worker) {
            $count = Vaccination::where('resident_id', $r->id)->where('vaccine_id', $vaccines[$vaccine]->id)->count();
            Vaccination::create([
                'resident_id' => $r->id, 'vaccine_id' => $vaccines[$vaccine]->id, 'dose_number' => $count + 1,
                'date_given' => Carbon::today()->subDays($daysAgo), 'batch_number' => 'B-'.rand(1000, 9999),
                'given_by' => $worker->id,
            ]);
        };

        $maria = Resident::where('user_id', User::where('role', User::ROLE_RESIDENT)->value('id'))->firstOrFail();
        $give($maria, 'BCG', 148);
        $give($maria, 'Pentavalent', 60);      // next dose long overdue

        $juan = $make('Juan', 'Dela Cruz', 120, 'male', 'Purok 2');
        $give($juan, 'BCG', 118);
        $give($juan, 'Pentavalent', 24);       // next dose due in 4 days -> due

        $ana = $make('Ana', 'Reyes', 90, 'female', 'Purok 1');
        $give($ana, 'BCG', 88);
        $give($ana, 'Pentavalent', 5);         // next dose far away -> upcoming

        $pedro = $make('Pedro', 'Garcia', 400, 'male', 'Purok 3');
        $give($pedro, 'BCG', 395);             // MMR never given -> overdue

        $make('Liza', 'Ramos', 700, 'female', 'Purok 2');

        // ---- Medicines ----
        foreach ([
            ['Paracetamol', 'Paracetamol', '500 mg tablet', 200, 'tablets', 50, 'PCM-001', 400],
            ['Amoxicillin', 'Amoxicillin', '500 mg capsule', 30, 'capsules', 50, 'AMX-014', 200],
            ['Oral Rehydration Salts', 'ORS', '20.5 g sachet', 0, 'sachets', 20, 'ORS-221', 300],
            ['Vitamin A', 'Retinol', '200,000 IU capsule', 80, 'capsules', 20, 'VTA-090', 30],
            ['Ibuprofen', 'Ibuprofen', '200 mg tablet', 60, 'tablets', 30, 'IBU-777', -10],
        ] as [$name, $gen, $form, $qty, $unit, $reorder, $batch, $expiresInDays]) {
            Medicine::create([
                'name' => $name, 'generic_name' => $gen, 'form_strength' => $form, 'quantity' => $qty,
                'unit' => $unit, 'reorder_level' => $reorder, 'batch_number' => $batch,
                'expiry_date' => Carbon::today()->addDays($expiresInDays),
            ]);
        }

        $this->command?->info('Seeded. Resident portal login: '.$maria->reference_no.' / Resident@123');
    }
}
