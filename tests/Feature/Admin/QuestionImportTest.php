<?php

use App\Models\Exam;
use App\Models\MockTest;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\Subject;
use App\Models\User;
use Illuminate\Http\UploadedFile;

const HEADER = 'subject,topic,question,option_a,option_b,option_c,option_d,correct,explanation,difficulty';

function csvFile(array $lines): UploadedFile
{
    return UploadedFile::fake()->createWithContent('questions.csv', implode("\n", [HEADER, ...$lines]));
}

function bankQuestion(string $text, array $options = ['Shimla', 'Manali', 'Kullu', 'Mandi'], string $correct = 'A', string $subject = 'HP GK'): Question
{
    return Question::create([
        'subject_id' => Subject::firstOrCreate(['name' => $subject])->id, 'text' => $text,
        'option_a' => $options[0], 'option_b' => $options[1], 'option_c' => $options[2], 'option_d' => $options[3],
        'correct_option' => $correct, 'difficulty' => 'easy',
    ]);
}

beforeEach(fn () => $this->actingAs(User::factory()->superAdmin()->create()));

test('fingerprints ignore numbering, capitals, punctuation, spacing and option order', function () {
    $a = Question::hashes('Q12. What is the capital of Himachal Pradesh?', ['Shimla', 'Manali', 'Kullu', 'Mandi']);
    $b = Question::hashes('what is the  capital of himachal pradesh', ['mandi', 'Kullu', 'SHIMLA', 'Manali']);
    $c = Question::hashes('1857 revolution was led by?', ['a', 'b', 'c', 'd']);

    expect($a['fingerprint'])->toBe($b['fingerprint'])
        ->and(Question::clean('1857 revolution was led by?'))->toBe('1857 revolution was led by')
        ->and($c['fingerprint'])->not->toBe($a['fingerprint']);
});

test('importing into a mock previews each row, adds new ones to the bank and reuses ones already there', function () {
    $exam = Exam::create(['name' => 'HP TET', 'is_active' => true]);
    $mock = MockTest::create(['exam_id' => $exam->id, 'title' => 'TET Mock', 'duration_minutes' => 30]);
    $quiz = Quiz::create(['exam_id' => $exam->id, 'title' => 'TET Quiz 3']);
    $capital = bankQuestion('What is the capital of Himachal Pradesh?');
    $quiz->questions()->attach($capital->id, ['position' => 1]);
    $differs = bankQuestion('Largest district of HP?', ['Lahaul-Spiti', 'Kangra', 'Chamba', 'Kinnaur']);
    $possible = bankQuestion('Which river flows through Kullu?', ['Beas', 'Sutlej', 'Ravi', 'Chenab']);

    $response = $this->post("/admin/sets/mock-test/{$mock->id}/import", ['file' => csvFile([
        'HP GK,Districts,How many districts does HP have?,10,11,12,13,C,Twelve.,easy',
        'HP GK,,Q5. what is the capital of himachal pradesh,Manali,Shimla,Kullu,Mandi,B,,easy',
        'HP GK,,Largest district of HP?,Lahaul-Spiti,Kangra,Chamba,Kinnaur,B,Kangra by population.,easy',
        'HP GK,,Which river flows through Kullu?,Beas,Sutlej,Ravi,Yamuna,A,,easy',
        'HP GK,,Broken,a,b,c,d,X,,easy',
    ])]);
    $preview = $response->headers->get('Location');

    $this->get($preview)->assertInertia(fn ($page) => $page
        ->where('rows.0.status', 'new')
        ->where('rows.1.status', 'exists')
        ->where('rows.1.used_in', ['TET Quiz 3'])
        ->where('rows.2.status', 'differs')
        ->where('rows.3.status', 'possible')
        ->where('rows.4.status', 'error')
        ->where('target.title', 'TET Mock'));

    // Row 3: take the file's answer into the bank. Row 4: it is a different question.
    $this->post($preview, ['choices' => [2 => 'update', 3 => 'new']])->assertRedirect("/admin/sets/mock-test/{$mock->id}");

    expect(Question::count())->toBe(5)
        ->and($differs->fresh()->correct_option)->toBe('B')
        ->and($differs->fresh()->explanation)->toBe('Kangra by population.')
        ->and($mock->questions()->count())->toBe(4)
        ->and($mock->questions()->pluck('questions.id')->slice(1, 2)->values()->all())->toBe([$capital->id, $differs->id])
        ->and($possible->fresh())->not->toBeNull();

    // The preview is used up.
    $this->get($preview)->assertNotFound();
});

test('a quiz import can drop a question already in the bundle, and rows already in the quiz are skipped', function () {
    $quiz = Quiz::create(['title' => 'General quiz']);
    $q = bankQuestion('What is the capital of Himachal Pradesh?');
    $quiz->questions()->attach($q->id, ['position' => 1]);
    $other = bankQuestion('Which river flows through Kullu?', ['Beas', 'Sutlej', 'Ravi', 'Chenab']);

    $preview = $this->post("/admin/sets/quiz/{$quiz->id}/import", ['file' => csvFile([
        'HP GK,,What is the capital of Himachal Pradesh?,Shimla,Manali,Kullu,Mandi,A,,easy',
        'HP GK,,Which river flows through Kullu?,Beas,Sutlej,Ravi,Chenab,A,,easy',
    ])])->headers->get('Location');

    $this->get($preview)->assertInertia(fn ($page) => $page->where('rows.0.status', 'in_set')->where('rows.1.status', 'exists'));
    $this->post($preview, ['choices' => [1 => 'skip']]);

    expect($quiz->questions()->pluck('questions.id')->all())->toBe([$q->id])->and(Question::count())->toBe(2);
});

test('an import preview belongs to the admin who uploaded it and can be cancelled', function () {
    $preview = $this->post('/admin/questions/import', ['file' => csvFile(['HP GK,,Q?,a,b,c,d,A,,easy'])])->headers->get('Location');

    $this->actingAs(User::factory()->superAdmin()->create())->get($preview)->assertNotFound();

    $this->actingAs(User::first())->delete($preview)->assertRedirect('/admin/questions/import');
    expect(Question::count())->toBe(0);
});

test('a file with missing columns is refused before any preview', function () {
    $this->post('/admin/questions/import', ['file' => UploadedFile::fake()->createWithContent('q.csv', "question,answer\nQ,A")])
        ->assertSessionHasErrors('file');
});

test('adding a question that is already in the bank asks for confirmation', function () {
    bankQuestion('What is the capital of Himachal Pradesh?');
    $fields = [
        'subject_id' => Subject::first()->id, 'text' => 'what is the capital of Himachal Pradesh', 'option_a' => 'Shimla', 'option_b' => 'Manali',
        'option_c' => 'Kullu', 'option_d' => 'Mandi', 'correct_option' => 'A', 'difficulty' => 'easy',
    ];

    $this->post('/admin/questions', $fields)->assertSessionHasErrors('text');
    expect(Question::count())->toBe(1);

    $this->post('/admin/questions', [...$fields, 'allow_duplicate' => true])->assertSessionHasNoErrors();
    expect(Question::count())->toBe(2);
});

test('duplicates are found and merged, moving tests, quizzes and past answers to the kept question', function () {
    $keep = bankQuestion('What is the capital of Himachal Pradesh?');
    $copy = bankQuestion('Q1. what is the capital of himachal pradesh', ['Mandi', 'Kullu', 'Manali', 'Shimla'], 'D');
    bankQuestion('Unrelated question?', ['w', 'x', 'y', 'z']);

    $exam = Exam::create(['name' => 'HP TET', 'is_active' => true]);
    $mock = MockTest::create(['exam_id' => $exam->id, 'title' => 'Mock', 'duration_minutes' => 30]);
    $mock->questions()->attach([$keep->id => ['position' => 1], $copy->id => ['position' => 2]]);
    $quiz = Quiz::create(['title' => 'Quiz']);
    $quiz->questions()->attach($copy->id, ['position' => 1]);
    $student = User::factory()->create();
    $attempt = $student->quizAttempts()->create(['mode' => 'set', 'quiz_id' => $quiz->id, 'title' => 'Quiz', 'total_questions' => 1]);
    $attempt->answers()->create(['question_id' => $copy->id, 'position' => 1, 'selected_option' => 'D', 'is_correct' => true]);

    $this->get('/admin/questions/duplicates')->assertInertia(fn ($page) => $page
        ->has('groups', 1)
        ->where('groups.0.match', 'exact')
        ->has('groups.0.questions', 2));

    $this->post('/admin/questions/merge', ['keep_id' => $keep->id, 'merge_ids' => [$copy->id]])->assertSessionHasNoErrors();

    expect(Question::find($copy->id))->toBeNull()
        ->and($mock->questions()->pluck('questions.id')->all())->toBe([$keep->id])
        ->and($quiz->questions()->pluck('questions.id')->all())->toBe([$keep->id])
        ->and($attempt->answers()->first()->question_id)->toBe($keep->id);
});
