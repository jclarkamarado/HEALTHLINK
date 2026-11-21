<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vaccines', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->unsignedTinyInteger('total_doses')->default(1);
            $table->unsignedInteger('first_dose_min_age_days')->default(0);
            $table->unsignedInteger('max_age_days')->nullable(); // no new series after this age
            $table->unsignedInteger('interval_days')->default(0); // days after previous dose
            $table->unsignedInteger('grace_days')->default(7);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('vaccines');
    }
};
