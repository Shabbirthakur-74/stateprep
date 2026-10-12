<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The extra details a student gives right after signing up, and the exams they are preparing for.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('phone', 10);
            $table->date('date_of_birth');
            $table->string('gender', 20)->nullable();
            $table->string('district', 50);
            $table->string('qualification', 50)->nullable();
            $table->timestamps();
        });

        Schema::create('exam_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->unique(['exam_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('exam_user');
        Schema::dropIfExists('student_profiles');
    }
};
