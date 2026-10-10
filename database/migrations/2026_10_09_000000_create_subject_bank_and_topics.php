<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Subjects become one shared bank (HP GK, Indian Polity...) that exams link to, instead of each exam owning
 * its own copy. Subjects get topics (Districts, Rivers...) and questions can be tagged with a topic.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('exam_subject', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();

            $table->unique(['exam_id', 'subject_id']);
        });

        Schema::create('topics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('subject_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->unsignedSmallInteger('position')->default(0);
            $table->timestamps();

            $table->unique(['subject_id', 'name']);
        });

        Schema::table('questions', function (Blueprint $table) {
            $table->foreignId('topic_id')->nullable()->after('subject_id')->constrained()->nullOnDelete();
        });

        // Every subject keeps its exam as a link.
        DB::table('exam_subject')->insertUsing(['exam_id', 'subject_id'], DB::table('subjects')->select('exam_id', 'id'));

        // Subjects with the same name across exams become one shared subject.
        foreach (DB::table('subjects')->select('name', DB::raw('MIN(id) as keep_id'))->groupBy('name')->get() as $group) {
            $duplicates = DB::table('subjects')->where('name', $group->name)->where('id', '!=', $group->keep_id)->pluck('id');
            if ($duplicates->isEmpty()) {
                continue;
            }

            foreach (DB::table('exam_subject')->whereIn('subject_id', $duplicates)->pluck('exam_id') as $examId) {
                DB::table('exam_subject')->insertOrIgnore(['exam_id' => $examId, 'subject_id' => $group->keep_id]);
            }
            DB::table('questions')->whereIn('subject_id', $duplicates)->update(['subject_id' => $group->keep_id]);
            DB::table('subjects')->whereIn('id', $duplicates)->delete();
        }

        // Merging can leave the same question twice in one subject; keep the first and repoint tests to it.
        $repeated = DB::table('questions')
            ->select('subject_id', 'text', DB::raw('MIN(id) as keep_id'))
            ->groupBy('subject_id', 'text')
            ->havingRaw('COUNT(*) > 1')
            ->get();

        foreach ($repeated as $group) {
            $duplicates = DB::table('questions')
                ->where('subject_id', $group->subject_id)->where('text', $group->text)->where('id', '!=', $group->keep_id)
                ->pluck('id');

            foreach (DB::table('mock_test_question')->whereIn('question_id', $duplicates)->get() as $row) {
                $alreadyThere = DB::table('mock_test_question')->where('mock_test_id', $row->mock_test_id)->where('question_id', $group->keep_id)->exists();
                $alreadyThere
                    ? DB::table('mock_test_question')->where('id', $row->id)->delete()
                    : DB::table('mock_test_question')->where('id', $row->id)->update(['question_id' => $group->keep_id]);
            }
            DB::table('questions')->whereIn('id', $duplicates)->delete();
        }

        Schema::table('subjects', function (Blueprint $table) {
            $table->dropForeign(['exam_id']);
            $table->dropUnique(['exam_id', 'name']);
            $table->dropColumn('exam_id');
            $table->unique('name');
        });
    }

    public function down(): void
    {
        // Merged subjects cannot be split back into per-exam copies.
    }
};
