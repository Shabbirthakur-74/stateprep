<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Mock tests also carry previous year papers (type = pyq) and can be free or paid.
        Schema::table('mock_tests', function (Blueprint $table) {
            $table->string('type', 10)->default('mock')->after('title');
            $table->unsignedSmallInteger('year')->nullable()->after('type');
            $table->boolean('is_free')->default(true)->after('year');
            $table->decimal('price', 8, 2)->nullable()->after('is_free');
        });

        // Paid content a student has been given access to.
        Schema::create('test_access', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('mock_test_id')->constrained()->cascadeOnDelete();
            $table->foreignId('granted_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['user_id', 'mock_test_id']);
        });

        // Attempts now also cover topic quizzes, which have no mock test. Title, exam and type are copied
        // onto the attempt so history survives later edits or deletion of the source.
        Schema::table('test_attempts', function (Blueprint $table) {
            $table->unsignedBigInteger('mock_test_id')->nullable()->change();
            $table->string('type', 10)->default('mock')->after('user_id');
            $table->string('title')->nullable()->after('type');
            $table->foreignId('exam_id')->nullable()->after('title')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->nullable()->after('exam_id')->constrained()->cascadeOnDelete();
        });

        DB::statement('UPDATE test_attempts SET
            title = (SELECT title FROM mock_tests WHERE mock_tests.id = test_attempts.mock_test_id),
            exam_id = (SELECT exam_id FROM mock_tests WHERE mock_tests.id = test_attempts.mock_test_id)');
    }

    public function down(): void
    {
        Schema::table('test_attempts', function (Blueprint $table) {
            $table->dropConstrainedForeignId('subject_id');
            $table->dropConstrainedForeignId('exam_id');
            $table->dropColumn(['title', 'type']);
        });

        Schema::dropIfExists('test_access');

        Schema::table('mock_tests', function (Blueprint $table) {
            $table->dropColumn(['type', 'year', 'is_free', 'price']);
        });
    }
};
