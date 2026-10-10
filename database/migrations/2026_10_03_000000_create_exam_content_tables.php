<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exams', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('subjects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->timestamps();

            $table->unique(['exam_id', 'name']);
        });

        Schema::create('questions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->text('text');
            $table->string('option_a', 500);
            $table->string('option_b', 500);
            $table->string('option_c', 500);
            $table->string('option_d', 500);
            $table->char('correct_option', 1);
            $table->text('explanation')->nullable();
            $table->string('difficulty', 10)->default('medium');
            $table->timestamps();
        });

        Schema::create('mock_tests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->unsignedSmallInteger('duration_minutes');
            $table->decimal('marks_per_question', 5, 2)->default(1);
            $table->decimal('negative_marks', 5, 2)->default(0);
            $table->boolean('is_published')->default(false);
            $table->timestamps();
        });

        Schema::create('mock_test_question', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mock_test_id')->constrained()->cascadeOnDelete();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('position')->default(0);

            $table->unique(['mock_test_id', 'question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mock_test_question');
        Schema::dropIfExists('mock_tests');
        Schema::dropIfExists('questions');
        Schema::dropIfExists('subjects');
        Schema::dropIfExists('exams');
    }
};
