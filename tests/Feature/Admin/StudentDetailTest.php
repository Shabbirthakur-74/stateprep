<?php

use App\Enums\Permission;
use App\Models\Exam;
use App\Models\Question;
use App\Models\Subject;
use App\Models\User;

/** A finished quiz for the student with the given questions answered right or wrong. */
function finishedQuiz(User $student, array $answers): void
{
    $attempt = $student->quizAttempts()->create(['mode' => 'random', 'title' => 'Practice', 'total_questions' => count($answers)]);
    foreach (array_values($answers) as $i => [$question, $right]) {
        $attempt->answers()->create(['question_id' => $question->id, 'position' => $i + 1, 'selected_option' => $right ? 'A' : 'B', 'is_correct' => $right]);
    }
    $attempt->forceFill(['correct_count' => collect($answers)->where(1, true)->count(), 'submitted_at' => now()])->save();
}

function bankQ(Subject $subject, ?int $topicId, string $difficulty, int $n): Question
{
    return Question::create([
        'subject_id' => $subject->id, 'topic_id' => $topicId, 'text' => "{$subject->name} {$difficulty} {$n}", 'option_a' => 'a', 'option_b' => "b{$n}",
        'option_c' => 'c', 'option_d' => 'd', 'correct_option' => 'A', 'difficulty' => $difficulty,
    ]);
}

test('the student page shows chosen exams, purchases, activity and subject-wise performance', function () {
    $student = User::factory()->create();
    $exam = Exam::create(['name' => 'HP TET (JBT)', 'is_active' => true]);
    $student->targetExams()->attach($exam);
    $student->doubts()->create(['body' => 'How does this work?']);

    $gk = Subject::create(['name' => 'HP GK']);
    $districts = $gk->topics()->create(['name' => 'Districts']);
    $rivers = $gk->topics()->create(['name' => 'Rivers']);
    $maths = Subject::create(['name' => 'Maths']);

    finishedQuiz($student, [
        [bankQ($gk, $districts->id, 'easy', 1), true],
        [bankQ($gk, $districts->id, 'easy', 2), true],
        [bankQ($gk, $rivers->id, 'hard', 3), false],
        [bankQ($maths, null, 'medium', 4), false],
        [bankQ($maths, null, 'medium', 5), true],
    ]);

    $this->actingAs(User::factory()->superAdmin()->create())->get("/admin/students/{$student->id}")->assertOk()->assertInertia(fn ($page) => $page
        ->component('admin/students/show')
        ->where('exams.0.name', 'HP TET (JBT)')
        ->where('exams.0.content_url', route('admin.exams.content', $exam->id))
        ->where('activity.doubts', 1)
        ->where('activity.open_doubts', 1)
        // Weakest subject first: Maths 1/2 (50%) before HP GK 2/3 (66.7%).
        ->where('subjects.0.subject', 'Maths')
        ->where('subjects.0.accuracy', 50)
        ->where('subjects.1.subject', 'HP GK')
        ->where('subjects.1.correct', 2)
        ->where('subjects.1.answered', 3)
        // Within HP GK, Rivers (0%) comes before Districts (100%).
        ->where('subjects.1.topics.0.topic', 'Rivers')
        ->where('subjects.1.topics.1.accuracy', 100)
        ->where('byDifficulty', ['easy' => 100, 'medium' => 50, 'hard' => 0])
        ->has('trend', 1));
});

test('links to other sections only appear for admins who can open them', function () {
    $student = User::factory()->create();
    $student->targetExams()->attach(Exam::create(['name' => 'HPAS', 'is_active' => true]));

    $this->actingAs(User::factory()->staff([Permission::Students])->create())->get("/admin/students/{$student->id}")
        ->assertInertia(fn ($page) => $page->where('exams.0.content_url', null)->where('activity.doubts_url', null));
});
