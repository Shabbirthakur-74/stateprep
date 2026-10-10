<?php

namespace App\Models;

use App\Models\Concerns\HasCover;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * A state exam. Its public page sells the exam bundle: everything published for the exam, at one price.
 */
class Exam extends Model
{
    use HasCover;

    protected $fillable = [
        'name', 'description', 'is_active', 'overview', 'facts', 'highlights', 'faqs', 'is_free', 'price', 'original_price', 'validity_months',
    ];

    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
            'show_on_home' => 'boolean',
            'is_free' => 'boolean',
            'price' => 'float',
            'original_price' => 'float',
            'facts' => 'array',
            'highlights' => 'array',
            'faqs' => 'array',
        ];
    }

    /**
     * Whether the exam bundle can be bought: it is paid and has a price.
     */
    public function isForSale(): bool
    {
        return ! $this->is_free && $this->price > 0;
    }

    /**
     * Active exams picked for "Exams We Cover", in their homepage order.
     */
    public function scopeOnHome(Builder $query): void
    {
        $query->where('is_active', true)->where('show_on_home', true)->orderBy('home_position')->orderBy('name');
    }

    protected static function booted(): void
    {
        static::creating(function (Exam $exam) {
            $exam->slug = static::uniqueSlug($exam->name);
            // New exams go to the end of the homepage list.
            $exam->home_position = (int) static::max('home_position') + 1;
        });
    }

    private static function uniqueSlug(string $name): string
    {
        $base = Str::slug($name) ?: 'exam';
        $slug = $base;

        for ($i = 2; static::where('slug', $slug)->exists(); $i++) {
            $slug = "{$base}-{$i}";
        }

        return $slug;
    }

    /**
     * Subjects from the shared bank that this exam covers.
     */
    public function subjects(): BelongsToMany
    {
        return $this->belongsToMany(Subject::class);
    }

    public function quizzes(): HasMany
    {
        return $this->hasMany(Quiz::class);
    }

    public function mockTests(): HasMany
    {
        return $this->hasMany(MockTest::class);
    }
}
