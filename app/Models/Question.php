<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Support\Str;

/**
 * A multiple choice question in the shared bank. Fingerprints of its cleaned-up text and options are kept,
 * so the same question typed slightly differently (spacing, capitals, punctuation, "Q12." numbering,
 * options in another order) is recognised as a duplicate.
 */
class Question extends Model
{
    public const DIFFICULTIES = ['easy', 'medium', 'hard'];

    public const OPTIONS = ['A', 'B', 'C', 'D'];

    protected $fillable = [
        'subject_id', 'topic_id', 'text', 'option_a', 'option_b', 'option_c', 'option_d',
        'correct_option', 'explanation', 'difficulty',
    ];

    protected $hidden = ['text_hash', 'options_hash', 'fingerprint'];

    protected static function booted(): void
    {
        static::saving(function (Question $question) {
            if ($question->isDirty(['text', 'option_a', 'option_b', 'option_c', 'option_d']) || ! $question->fingerprint) {
                $question->forceFill(self::hashes($question->text, $question->options()));
            }
        });
    }

    public function subject(): BelongsTo
    {
        return $this->belongsTo(Subject::class);
    }

    public function topic(): BelongsTo
    {
        return $this->belongsTo(Topic::class);
    }

    public function mockTests(): BelongsToMany
    {
        return $this->belongsToMany(MockTest::class, 'mock_test_question');
    }

    public function quizzes(): BelongsToMany
    {
        return $this->belongsToMany(Quiz::class, 'quiz_question');
    }

    /**
     * The four options in A–D order.
     *
     * @return list<string>
     */
    public function options(): array
    {
        return [(string) $this->option_a, (string) $this->option_b, (string) $this->option_c, (string) $this->option_d];
    }

    /** Text of the correct option. */
    public function correctText(): string
    {
        return $this->options()[array_search($this->correct_option, self::OPTIONS, true) ?: 0];
    }

    /**
     * Lower case, without question numbering ("Q12.", "3)"), punctuation or extra spaces.
     * Letters of every script are kept, so Hindi questions compare correctly too.
     */
    public static function clean(string $text): string
    {
        $text = Str::lower(html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8'));
        $text = preg_replace('/^\s*(?:q(?:uestion)?\s*\.?\s*(?:no\.?)?\s*\d+\s*[.):\-–]?|\(?\d+\s*[.)\]:\-–])\s*/u', '', $text);
        $text = preg_replace('/[^\p{L}\p{N}\p{M}]+/u', ' ', $text);

        return trim(preg_replace('/\s+/u', ' ', $text));
    }

    /**
     * Fingerprints of a question: its text, its options in any order, and both together.
     *
     * @param  list<string>  $options
     * @return array{text_hash: string, options_hash: string, fingerprint: string}
     */
    public static function hashes(string $text, array $options): array
    {
        $cleaned = array_map(fn ($o) => self::clean((string) $o), $options);
        sort($cleaned);
        $textHash = sha1(self::clean($text));
        $optionsHash = sha1(implode('|', $cleaned));

        return ['text_hash' => $textHash, 'options_hash' => $optionsHash, 'fingerprint' => sha1($textHash.$optionsHash)];
    }

    /**
     * How alike two question texts are, from 0 to 100, after cleaning.
     */
    public static function similarity(string $a, string $b): float
    {
        similar_text(self::clean($a), self::clean($b), $percent);

        return round($percent, 1);
    }

    /**
     * The closest existing question: the same question (same text and options), the same text with other options,
     * or the same options with text at least 85% alike. Returns the match and how it matched.
     *
     * @param  list<string>  $options
     * @return array{question: Question, match: 'exact'|'possible'}|null
     */
    public static function findDuplicate(string $text, array $options, ?int $ignoreId = null): ?array
    {
        $hashes = self::hashes($text, $options);
        $base = self::query()->when($ignoreId, fn ($q) => $q->whereKeyNot($ignoreId));

        if ($exact = (clone $base)->where('fingerprint', $hashes['fingerprint'])->orderBy('id')->first()) {
            return ['question' => $exact, 'match' => 'exact'];
        }

        if ($sameText = (clone $base)->where('text_hash', $hashes['text_hash'])->orderBy('id')->first()) {
            return ['question' => $sameText, 'match' => 'possible'];
        }

        $best = (clone $base)->where('options_hash', $hashes['options_hash'])->limit(50)->get()
            ->map(fn (Question $q) => [$q, self::similarity($text, $q->text)])
            ->filter(fn ($pair) => $pair[1] >= 85)
            ->sortByDesc(fn ($pair) => $pair[1])
            ->first();

        return $best ? ['question' => $best[0], 'match' => 'possible'] : null;
    }
}
