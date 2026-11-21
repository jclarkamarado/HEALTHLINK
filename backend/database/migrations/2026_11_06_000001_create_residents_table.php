<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('residents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reference_no')->unique();
            $table->string('first_name');
            $table->string('middle_name')->nullable();
            $table->string('last_name');
            $table->date('birth_date');
            $table->boolean('birth_date_estimated')->default(false);
            $table->string('sex', 10);
            $table->string('contact_number')->nullable();
            $table->string('address')->nullable();
            $table->string('purok')->nullable();
            $table->string('barangay')->nullable();
            $table->string('status')->default('active'); // active | transferred | inactive | deceased
            $table->boolean('identity_checked')->default(false);
            $table->foreignId('identity_checked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('registered_by')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('consent_given')->default(false);
            $table->string('consent_by')->nullable();
            $table->date('consent_date')->nullable();
            $table->string('privacy_notice_version')->nullable();
            $table->timestamps();

            $table->index(['last_name', 'first_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('residents');
    }
};
