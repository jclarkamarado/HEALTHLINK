<?php

namespace Database\Seeders;

use App\Models\Resident;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;

/**
 * One account for every role. Safe to re-run: accounts are matched by username and
 * created only if missing, so running it twice never duplicates them or resets a
 * password that was changed in the app.
 *
 *   php artisan db:seed --class=RoleUserSeeder
 *
 * CHANGE THESE PASSWORDS before any real use.
 */
class RoleUserSeeder extends Seeder
{
    public function run(): void
    {
        // 1) Administrator
        $admin = User::firstOrCreate(['username' => 'admin'], [
            'first_name' => 'System',
            'last_name' => 'Administrator',
            'email' => 'admin@healthlink.test',
            'role' => User::ROLE_ADMIN,
            'is_active' => true,
            'password' => 'Admin@12345',
        ]);

        // 2) Health worker
        $worker = User::firstOrCreate(['username' => 'worker1'], [
            'first_name' => 'Rosa',
            'last_name' => 'Mendoza',
            'email' => 'worker@healthlink.test',
            'role' => User::ROLE_WORKER,
            'is_active' => true,
            'password' => 'Worker@12345',
        ]);

        // 3) Resident (portal login). A resident account only works when it is
        //    linked to a resident record, so create that record too.
        //    Portal username = the resident's reference number.
        $referenceNo = 'HL-'.date('Y').'-DEMO';

        $resident = Resident::firstOrCreate(['reference_no' => $referenceNo], [
            'first_name' => 'Maria',
            'last_name' => 'Santos',
            'birth_date' => Carbon::today()->subDays(150),
            'sex' => 'female',
            'purok' => 'Purok 1',
            'barangay' => 'Apokon',
            'address' => 'Purok 1, Apokon, Tagum City',
            'contact_number' => '09123456789',
            'status' => 'active',
            'identity_checked' => true,
            'identity_checked_by' => $worker->id,
            'registered_by' => $worker->id,
            'consent_given' => true,
            'consent_by' => 'Parent/Guardian',
            'consent_date' => Carbon::today(),
            'privacy_notice_version' => 'v1',
        ]);

        $portalUser = User::firstOrCreate(['username' => $referenceNo], [
            'first_name' => $resident->first_name,
            'last_name' => $resident->last_name,
            'role' => User::ROLE_RESIDENT,
            'is_active' => true,
            'password' => 'Resident@123',
        ]);

        if ($resident->user_id !== $portalUser->id) {
            $resident->update(['user_id' => $portalUser->id]);
        }

        $this->command?->info('Role accounts ready:');
        $this->command?->table(['Role', 'Username', 'Password'], [
            [User::ROLE_ADMIN, $admin->username, 'Admin@12345'],
            [User::ROLE_WORKER, $worker->username, 'Worker@12345'],
            [User::ROLE_RESIDENT, $portalUser->username, 'Resident@123'],
        ]);
    }
}
