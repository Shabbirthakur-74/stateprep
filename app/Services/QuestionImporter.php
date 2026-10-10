<?php

namespace App\Services;

use App\Models\Question;
use App\Models\Subject;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * Imports questions from a CSV file in two steps. preview() reads the file and checks every row against the bank;
 * commit() then saves the rows with the admin's choices. Imported questions always go into the bank. A row that is
 * already in the bank is not added again: the existing question is used instead, so a quiz, mock or PYQ still gets
 * every question of its file.
 *
 * Row statuses:
 *  - new        not in the bank yet
 *  - exists     the same question is in the bank (text and options match after cleaning up)
 *  - possible   probably the same: same text with other options, or same options with very similar text
 *  - differs    the same question, but the file gives another correct answer
 *  - repeat     the same question appears earlier in this file
 *  - in_set     already in the quiz or test being imported into
 *  - error      something is missing or invalid
 */
class QuestionImporter
{
    public const COLUMNS = ['subject', 'topic', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct', 'explanation', 'difficulty'];

    /** What the admin may choose for each status; the first one is the default. */
    public const CHOICES = [
        'new' => ['add', 'skip'],
        'exists' => ['use', 'skip'],
        'possible' => ['existing', 'new', 'skip'],
        'differs' => ['keep', 'update', 'new', 'skip'],
    ];

    public function __construct(private ?QuestionSet $set = null) {}

    /**
     * @return array{rows: list<array<string, mixed>>, errors: list<string>}
     */
    public function preview(string $path): array
    {
        $handle = fopen($path, 'r');
        $header = array_map(fn ($h) => Str::snake(trim(preg_replace('/^\xEF\xBB\xBF/', '', (string) $h))), fgetcsv($handle) ?: []);

        $missing = array_diff(['subject', 'question', 'option_a', 'option_b', 'option_c', 'option_d', 'correct'], $header);
        if ($missing) {
            fclose($handle);

            return ['rows' => [], 'errors' => ['Missing columns: '.implode(', ', $missing).'. Download the template to see the expected layout.']];
        }

        $inSet = $this->set?->ids() ?? [];
        $seen = [];
        $rows = [];
        $line = 1;

        while (($cells = fgetcsv($handle)) !== false) {
            $line++;
            if (count(array_filter($cells, fn ($v) => trim((string) $v) !== '')) === 0) {
                continue;
            }

            $data = array_map(fn ($v) => trim((string) $v), array_combine($header, array_pad(array_slice($cells, 0, count($header)), count($header), '')));
            $row = [
                'line' => $line,
                'subject' => $data['subject'],
                'topic' => $data['topic'] ?? '',
                'text' => $data['question'],
                'options' => [$data['option_a'], $data['option_b'], $data['option_c'], $data['option_d']],
                'correct' => strtoupper($data['correct']),
                'explanation' => $data['explanation'] ?? '',
                'difficulty' => strtolower($data['difficulty'] ?? '') ?: 'medium',
                'match' => null,
                'used_in' => [],
            ];

            $problem = match (true) {
                $row['subject'] === '' => 'subject is empty',
                $row['text'] === '' => 'question is empty',
                in_array('', $row['options'], true) => 'all four options are required',
                ! in_array($row['correct'], Question::OPTIONS, true) => 'correct must be A, B, C or D',
                ! in_array($row['difficulty'], Question::DIFFICULTIES, true) => 'difficulty must be easy, medium or hard',
                default => null,
            };

            if ($problem) {
                $rows[] = [...$row, 'status' => 'error', 'problem' => $problem];

                continue;
            }

            $fingerprint = Question::hashes($row['text'], $row['options'])['fingerprint'];
            if (isset($seen[$fingerprint])) {
                $rows[] = [...$row, 'status' => 'repeat', 'problem' => "same question as row {$seen[$fingerprint]}"];

                continue;
            }
            $seen[$fingerprint] = $line;

            $rows[] = $this->classify($row, $inSet);
        }

        fclose($handle);

        return ['rows' => $rows, 'errors' => []];
    }

    /**
     * Saves the previewed rows with the admin's choices (row index => choice; missing means the default) and, when
     * importing into a quiz or test, adds the questions to it in file order.
     *
     * @param  list<array<string, mixed>>  $rows
     * @param  array<int|string, string>  $choices
     * @return array{created: int, reused: int, updated: int, skipped: int, added: int}
     */
    public function commit(array $rows, array $choices): array
    {
        $result = ['created' => 0, 'reused' => 0, 'updated' => 0, 'skipped' => 0, 'added' => 0];
        $ids = [];

        DB::transaction(function () use ($rows, $choices, &$result, &$ids) {
            foreach ($rows as $i => $row) {
                $allowed = self::CHOICES[$row['status']] ?? null;
                if (! $allowed) {
                    $result['skipped']++;

                    continue;
                }

                $choice = in_array($choices[$i] ?? null, $allowed, true) ? $choices[$i] : $allowed[0];
                $existing = $row['match'] ? Question::find($row['match']['id']) : null;

                match (true) {
                    $choice === 'skip' => $result['skipped']++,
                    in_array($choice, ['add', 'new'], true) || ! $existing => $ids[] = $this->create($row, $result),
                    $choice === 'update' => $ids[] = $this->updateAnswer($existing, $row, $result),
                    default => $ids[] = $this->reuse($existing, $result),
                };
            }

            if ($this->set) {
                $result['added'] = $this->set->add($ids);
            }
        });

        return $result;
    }

    private function classify(array $row, array $inSet): array
    {
        $found = Question::findDuplicate($row['text'], $row['options']);

        if (! $found) {
            return [...$row, 'status' => 'new'];
        }

        $existing = $found['question']->load('subject:id,name');
        $row['match'] = [
            'id' => $existing->id,
            'text' => $existing->text,
            'subject' => $existing->subject?->name,
            'correct' => $existing->correctText(),
            'similarity' => Question::similarity($row['text'], $existing->text),
        ];

        if (in_array($existing->id, $inSet, true)) {
            return [...$row, 'status' => 'in_set', 'problem' => 'already in this '.($this->set->type() === 'quiz' ? 'quiz' : 'test')];
        }

        $row['used_in'] = $this->set?->usedIn([$existing->id])[$existing->id] ?? [];

        if ($found['match'] === 'possible') {
            return [...$row, 'status' => 'possible'];
        }

        $fileAnswer = Question::clean($row['options'][array_search($row['correct'], Question::OPTIONS, true)]);

        return [...$row, 'status' => $fileAnswer === Question::clean($existing->correctText()) ? 'exists' : 'differs'];
    }

    private function create(array $row, array &$result): int
    {
        $subject = Subject::firstOrCreate(['name' => $row['subject']]);
        $topicId = $row['topic'] !== ''
            ? $subject->topics()->firstOrCreate(['name' => $row['topic']], ['position' => (int) $subject->topics()->max('position') + 1])->id
            : null;

        $question = Question::create([
            'subject_id' => $subject->id,
            'topic_id' => $topicId,
            'text' => $row['text'],
            'option_a' => $row['options'][0],
            'option_b' => $row['options'][1],
            'option_c' => $row['options'][2],
            'option_d' => $row['options'][3],
            'correct_option' => $row['correct'],
            'explanation' => $row['explanation'] ?: null,
            'difficulty' => $row['difficulty'],
        ]);
        $result['created']++;

        return $question->id;
    }

    /** Takes the file's answer (and explanation, if it has one) into the bank question. */
    private function updateAnswer(Question $question, array $row, array &$result): int
    {
        $answer = Question::clean($row['options'][array_search($row['correct'], Question::OPTIONS, true)]);
        $letter = collect($question->options())->search(fn ($option) => Question::clean($option) === $answer);

        $question->update([
            'correct_option' => $letter === false ? $question->correct_option : Question::OPTIONS[$letter],
            'explanation' => $row['explanation'] ?: $question->explanation,
        ]);
        $result['updated']++;

        return $question->id;
    }

    private function reuse(Question $question, array &$result): int
    {
        $result['reused']++;

        return $question->id;
    }
}
