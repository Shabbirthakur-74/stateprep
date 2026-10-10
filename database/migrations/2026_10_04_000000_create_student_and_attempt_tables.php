<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->timestamp('suspended_at')->nullable()->after('role');
        });

        Schema::create('student_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('phone', 15);
            $table->date('date_of_birth')->nullable();
            $table->string('gender', 10)->nullable();
            $table->string('district', 50)->nullable();
            $table->string('qualification', 50)->nullable();
            $table->timestamps();
        });

        // Exams a student says they are preparing for.
        Schema::create('exam_user', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();

            $table->unique(['exam_id', 'user_id']);
        });

        Schema::create('test_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('mock_test_id')->constrained()->cascadeOnDelete();
            $table->dateTime('started_at');
            $table->dateTime('ends_at');
            $table->dateTime('submitted_at')->nullable();
            $table->unsignedSmallInteger('total_questions');
            $table->unsignedSmallInteger('correct_count')->default(0);
            $table->unsignedSmallInteger('wrong_count')->default(0);
            $table->unsignedSmallInteger('unanswered_count')->default(0);
            // Marking scheme is copied at the start so later edits to the test never change past results.
            $table->decimal('marks_per_question', 5, 2);
            $table->decimal('negative_marks', 5, 2);
            $table->decimal('max_score', 8, 2);
            $table->decimal('score', 8, 2)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'mock_test_id']);
        });

        Schema::create('attempt_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_attempt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('position');
            $table->char('selected_option', 1)->nullable();
            $table->boolean('is_marked')->default(false);
            $table->boolean('is_correct')->nullable();

            $table->unique(['test_attempt_id', 'question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attempt_answers');
        Schema::dropIfExists('test_attempts');
        Schema::dropIfExists('exam_user');
        Schema::dropIfExists('student_profiles');
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('suspended_at');
        });
    }
};
