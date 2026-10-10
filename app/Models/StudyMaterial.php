<?php

namespace App\Models;

use App\Models\Concerns\HasCover;
use App\Models\Concerns\HasHomeCards;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * Notes, PDFs or a link to outside material for one exam. Either an uploaded file or an external URL.
 */
class StudyMaterial extends Model
{
    use HasCover, HasHomeCards;

    // Allowed upload types and the maximum size in kilobytes.
    public const FILE_TYPES = ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png'];

    public const MAX_FILE_KB = 20480;

    protected $attributes = [
        'is_free' => true,
        'is_published' => false,
    ];

    protected $fillable = ['exam_id', 'title', 'description', 'file_path', 'file_name', 'external_url', 'is_free', 'price', 'is_published'];

    protected $hidden = ['file_path'];

    protected function casts(): array
    {
        return [
            'is_free' => 'boolean',
            'is_published' => 'boolean',
            'price' => 'float',
        ];
    }

    protected static function booted(): void
    {
        // Uploaded files go with the record.
        static::deleted(function (self $material) {
            if ($material->file_path) {
                Storage::disk('local')->delete($material->file_path);
            }
        });
    }

    public function exam(): BelongsTo
    {
        return $this->belongsTo(Exam::class);
    }

    public function isLink(): bool
    {
        return $this->file_path === null;
    }

    /**
     * Short label for the kind of material, e.g. "PDF" or "Link".
     */
    public function formatLabel(): string
    {
        return $this->isLink() ? 'Link' : strtoupper(pathinfo((string) $this->file_name, PATHINFO_EXTENSION) ?: 'File');
    }

    /**
     * How the in-app reader shows the material: a PDF or image inline, a YouTube video, a web page, or a download
     * for Office files, which browsers cannot display.
     */
    public function viewer(): string
    {
        if ($this->isLink()) {
            return $this->youtubeId() ? 'video' : 'link';
        }

        return match (strtolower(pathinfo((string) $this->file_name, PATHINFO_EXTENSION))) {
            'pdf' => 'pdf',
            'jpg', 'jpeg', 'png' => 'image',
            default => 'download',
        };
    }

    /**
     * Privacy-friendly embed address when the link points to a YouTube video.
     */
    public function embedUrl(): ?string
    {
        return ($id = $this->youtubeId()) ? "https://www.youtube-nocookie.com/embed/{$id}" : null;
    }

    private function youtubeId(): ?string
    {
        $pattern = '~^https?://(?:www\.|m\.)?(?:youtube\.com/(?:watch\?(?:.*&)?v=|embed/|shorts/|live/)|youtu\.be/)([\w-]{11})~i';

        return $this->external_url && preg_match($pattern, $this->external_url, $m) ? $m[1] : null;
    }

    /**
     * Published material that belongs to an active exam.
     */
    public function scopeAvailable(Builder $query): void
    {
        $query->where('is_published', true)->whereHas('exam', fn ($q) => $q->where('is_active', true));
    }
}
