<?php

namespace App\Http\Controllers\Student;

use App\Http\Controllers\Controller;
use App\Models\StudyMaterial;
use App\Services\StudentCatalog;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as HttpResponse;

/**
 * Study material for students: the catalogue, the in-app reader and saving to "My Library".
 */
class StudyMaterialController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('student/study-material', ['materials' => StudentCatalog::materials($request->user())]);
    }

    /**
     * Reads free material inside the dashboard.
     */
    public function show(Request $request, StudyMaterial $material): Response
    {
        $material = $this->readable($material);
        $material->load('exam:id,name');

        return Inertia::render('student/material-reader', [
            'material' => [
                ...StudentCatalog::material($material),
                'viewer' => $material->viewer(),
                'file_name' => $material->file_name,
                'file_url' => $material->isLink() ? null : route('student.study-material.file', $material),
                'download_url' => $material->isLink() ? null : route('student.study-material.file', [$material, 'download' => 1]),
                'external_url' => $material->external_url,
                'embed_url' => $material->embedUrl(),
                'saved' => $request->user()->savedMaterials()->whereKey($material->id)->exists(),
            ],
        ]);
    }

    /**
     * The uploaded file, shown inline for the reader or as a download. Links go to the outside page.
     */
    public function file(Request $request, StudyMaterial $material): HttpResponse
    {
        $material = $this->readable($material);

        if ($material->isLink()) {
            return redirect()->away($material->external_url);
        }

        $disk = Storage::disk('local');
        $response = $request->boolean('download')
            ? $disk->download($material->file_path, $material->file_name)
            : $disk->response($material->file_path, $material->file_name);

        $response->headers->set('X-Content-Type-Options', 'nosniff');

        return $response;
    }

    public function save(Request $request, StudyMaterial $material): RedirectResponse
    {
        $material = StudyMaterial::available()->findOrFail($material->id);
        $request->user()->savedMaterials()->syncWithoutDetaching([$material->id]);

        return back();
    }

    public function unsave(Request $request, StudyMaterial $material): RedirectResponse
    {
        $request->user()->savedMaterials()->detach($material->id);

        return back();
    }

    /**
     * Only free, published material of an active exam can be read. Paid material stays locked until payments arrive.
     */
    private function readable(StudyMaterial $material): StudyMaterial
    {
        return StudyMaterial::available()->where('is_free', true)->findOrFail($material->id);
    }
}
