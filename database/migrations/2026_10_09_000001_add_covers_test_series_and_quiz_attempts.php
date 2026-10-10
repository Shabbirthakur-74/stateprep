<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Cover photos, stored on the public disk.
        Schema::table('mock_tests', function (Blueprint $table) {
            $table->string('cover_path')->nullable()->after('title');
        });

        Schema::table('study_materials', function (Blueprint $table) {
            $table->string('cover_path')->nullable()->after('title');
        });

        // A named pack of mock tests, taken in order.
        Schema::create('test_series', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('cover_path')->nullable();
            $table->boolean('is_free')->default(true);
            $table->decimal('price', 8, 2)->nullable();
            $table->boolean('is_published')->default(false);
            $table->timestamps();
        });

        Schema::create('mock_test_test_series', function (Blueprint $table) {
            $table->id();
            $table->foreignId('test_series_id')->constrained('test_series')->cascadeOnDelete();
            $table->foreignId('mock_test_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('position')->default(0);

            $table->unique(['test_series_id', 'mock_test_id']);
        });

        // A topic, mixed (whole subject) or random (all subjects) quiz. Its questions are fixed when it starts.
        Schema::create('quiz_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('mode', 10);
            $table->foreignId('subject_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('topic_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->unsignedSmallInteger('total_questions');
            $table->unsignedSmallInteger('correct_count')->default(0);
            $table->unsignedSmallInteger('wrong_count')->default(0);
            $table->dateTime('submitted_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'submitted_at']);
        });

        Schema::create('quiz_attempt_answers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quiz_attempt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('position');
            $table->char('selected_option', 1)->nullable();
            $table->boolean('is_correct')->nullable();

            $table->unique(['quiz_attempt_id', 'question_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quiz_attempt_answers');
        Schema::dropIfExists('quiz_attempts');
        Schema::dropIfExists('mock_test_test_series');
        Schema::dropIfExists('test_series');

        Schema::table('study_materials', function (Blueprint $table) {
            $table->dropColumn('cover_path');
        });

        Schema::table('mock_tests', function (Blueprint $table) {
            $table->dropColumn('cover_path');
        });
    }
};
