<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Study material a student saved to "My Library".
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('saved_materials', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('study_material_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'study_material_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('saved_materials');
    }
};
