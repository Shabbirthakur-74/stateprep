<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Admin\Concerns\SavesCover;
use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\StudyMaterial;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Study material: an uploaded file (kept private) or an outside link, with a cover photo.
 */
class StudyMaterialController extends Controller
{
    use SavesCover;

    public function index(): Response
    {
        return Inertia::render('admin/materials/index', [
            'materials' => StudyMaterial::with('exam:id,name')->latest()->get()
                ->map(fn (StudyMaterial $material) => [
                    'id' => $material->id,
                    'title' => $material->title,
                    'exam' => $material->exam?->name,
                    'cover_url' => $material->coverUrl(),
                    'format' => $material->formatLabel(),
                    'is_free' => $material->is_free,
                    'price' => $material->price,
                    'is_published' => $material->is_published,
                ]),
        ]);
    }

    public function create(Request $request): Response
    {
        return Inertia::render('admin/materials/form', [...$this->formOptions(), 'defaults' => ['exam_id' => $request->integer('exam') ?: null]]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate($this->rules(creating: true));

        $material = new StudyMaterial($this->attributes($data));
        $this->saveSource($material, $request);
        $this->saveCover($material, $request);

        return to_route('admin.materials.index')->with('status', "“{$material->title}” created.");
    }

    public function edit(StudyMaterial $material): Response
    {
        return Inertia::render('admin/materials/form', [
            ...$this->formOptions(),
            'material' => [
                ...$material->only('id', 'exam_id', 'title', 'description', 'external_url', 'file_name', 'is_free', 'price', 'is_published'),
                'cover_url' => $material->coverUrl(),
            ],
        ]);
    }

    public function update(Request $request, StudyMaterial $material): RedirectResponse
    {
        $data = $request->validate($this->rules(creating: false));

        $material->fill($this->attributes($data));
        $this->saveSource($material, $request);
        $this->saveCover($material, $request);

        return to_route('admin.materials.index')->with('status', "“{$material->title}” saved.");
    }

    public function destroy(StudyMaterial $material): RedirectResponse
    {
        $material->delete();

        return to_route('admin.materials.index')->with('status', "“{$material->title}” deleted.");
    }

    private function rules(bool $creating): array
    {
        return [
            'exam_id' => ['required', 'exists:exams,id'],
            'title' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string', 'max:2000'],
            'file' => [$creating ? 'required_without:external_url' : 'nullable', 'nullable', 'file', 'mimes:'.implode(',', StudyMaterial::FILE_TYPES), 'max:'.StudyMaterial::MAX_FILE_KB],
            'external_url' => [$creating ? 'required_without:file' : 'nullable', 'nullable', 'url:http,https', 'max:2048'],
            ...$this->priceRules(),
            ...$this->coverRules(),
        ];
    }

    private function attributes(array $data): array
    {
        return [
            ...collect($data)->only('exam_id', 'title', 'description', 'is_free', 'is_published')->all(),
            'price' => $data['is_free'] ? null : ($data['price'] ?? null),
        ];
    }

    /**
     * A new upload replaces the old file; a link replaces any file.
     */
    private function saveSource(StudyMaterial $material, Request $request): void
    {
        if ($request->hasFile('file')) {
            if ($material->file_path) {
                Storage::disk('local')->delete($material->file_path);
            }
            $material->file_path = $request->file('file')->store('materials', 'local');
            $material->file_name = $request->file('file')->getClientOriginalName();
            $material->external_url = null;
        } elseif ($request->filled('external_url')) {
            if ($material->file_path) {
                Storage::disk('local')->delete($material->file_path);
            }
            $material->file_path = null;
            $material->file_name = null;
            $material->external_url = $request->input('external_url');
        }
    }

    private function formOptions(): array
    {
        return [
            'exams' => Exam::orderBy('name')->get(['id', 'name']),
            'fileTypes' => StudyMaterial::FILE_TYPES,
            'maxFileMb' => StudyMaterial::MAX_FILE_KB / 1024,
        ];
    }
}
