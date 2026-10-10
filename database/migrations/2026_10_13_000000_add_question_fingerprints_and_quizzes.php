<?php

use App\Models\Question;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Duplicate detection for the question bank (fingerprints of the cleaned-up text and options),
 * and admin-made quizzes: general ones and ones that belong to an exam bundle.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('questions', function (Blueprint $table) {
            $table->char('text_hash', 40)->nullable()->index()->after('difficulty');
            $table->char('options_hash', 40)->nullable()->index()->after('text_hash');
            $table->char('fingerprint', 40)->nullable()->index()->after('options_hash');
        });

        DB::table('questions')->orderBy('id')->chunkById(500, function ($rows) {
            foreach ($rows as $row) {
                DB::table('questions')->where('id', $row->id)->update(
                    Question::hashes($row->text, [$row->option_a, $row->option_b, $row->option_c, $row->option_d])
                );
            }
        });

        Schema::create('quizzes', function (Blueprint $table) {
            $table->id();
            // Empty for a general quiz on the Quizzes screen; set for a quiz in that exam's bundle.
            $table->foreignId('exam_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('topic_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('cover_path')->nullable();
            $table->boolean('is_free')->default(true);
            $table->boolean('is_published')->default(false);
            $table->timestamps();
        });

        Schema::create('quiz_question', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quiz_id')->constrained()->cascadeOnDelete();
            $table->foreignId('question_id')->constrained()->cascadeOnDelete();
            $table->unsignedSmallInteger('position')->default(0);

            $table->unique(['quiz_id', 'question_id']);
        });

        Schema::table('quiz_attempts', function (Blueprint $table) {
            $table->foreignId('quiz_id')->nullable()->after('topic_id')->constrained()->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('quiz_attempts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('quiz_id');
        });
        Schema::dropIfExists('quiz_question');
        Schema::dropIfExists('quizzes');

        Schema::table('questions', function (Blueprint $table) {
            $table->dropIndex(['text_hash']);
            $table->dropIndex(['options_hash']);
            $table->dropIndex(['fingerprint']);
            $table->dropColumn(['text_hash', 'options_hash', 'fingerprint']);
        });
    }
};
