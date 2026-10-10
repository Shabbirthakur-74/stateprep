<?php

namespace App\Models;

use App\Models\Concerns\HasCover;
use App\Models\Concerns\HasHomeCards;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

/**
 * A named pack of mock tests, taken in order.
 */
class TestSeries extends Model
{
    use HasCover, HasHomeCards;

    protected $table = 'test_series';

    protected $attributes = [
        'is_free' => true,
        'is_published' => false,
    ];

    protected $fillable = ['exam_id', 'title', 'description', 'is_free', 'price', 'is_published'];

    protected function casts(): array
    {
        return [
            'is_free' => 'boolean',
            'is_published' => 'boolean',
            'price' => 'float',
        ];
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function mockTests(): BelongsToMany
    {
        return $this->belongsToMany(MockTest::class)->withPivot('position')->orderByPivot('position');
    }
}
