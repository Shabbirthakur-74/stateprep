<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The admin sections a staff member may use. Super admins always have every section.
        Schema::table('users', function (Blueprint $table) {
            $table->json('permissions')->nullable()->after('role');
        });

        // Site-wide settings edited from the admin area, e.g. result cut-offs.
        Schema::create('settings', function (Blueprint $table) {
            $table->string('key')->primary();
            $table->text('value')->nullable();
            $table->timestamps();
        });

        // A timed run of a mock test or previous year paper. The marking scheme and title are copied at the
        // start, so later edits to the test never change a past result.
        Schema::create('test_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('mock_test_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('test_series_id')->nullable()->constrained('test_series')->nullOnDelete();
            $table->string('type', 10);
            $table->string('title');
            $table->dateTime('ends_at');
            $table->dateTime('submitted_at')->nullable();
            $table->unsignedSmallInteger('total_questions');
            $table->unsignedSmallInteger('correct_count')->default(0);
            $table->unsignedSmallInteger('wrong_count')->default(0);
            $table->decimal('marks_per_question', 5, 2);
            $table->decimal('negative_marks', 5, 2);
            $table->decimal('max_score', 8, 2);
            $table->decimal('score', 8, 2)->nullable();
            $table->timestamps();

            $table->index(['user_id', 'submitted_at']);
        });

        Schema::create('test_attempt_answers', function (Blueprint $table) {
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
        Schema::dropIfExists('test_attempt_answers');
        Schema::dropIfExists('test_attempts');
        Schema::dropIfExists('settings');

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('permissions');
        });
    }
};
