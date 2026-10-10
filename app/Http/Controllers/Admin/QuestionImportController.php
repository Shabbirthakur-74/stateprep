<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Services\QuestionImporter;
use App\Services\QuestionSet;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * CSV import with a preview: upload, check every row against the bank, let the admin decide on duplicates, then save.
 * Imports go into the question bank, or into the bank and a quiz, mock test or PYQ at the same time.
 */
class QuestionImportController extends Controller
{
    /** How long an unconfirmed preview is kept. */
    private const KEEP_MINUTES = 60;

    /** Upload for the question bank. */
    public function bank(Request $request): RedirectResponse
    {
        return $this->upload($request, null);
    }

    /** Upload straight into a quiz, mock test or PYQ (and the bank). */
    public function set(Request $request, string $type, int $id): RedirectResponse
    {
        return $this->upload($request, QuestionSet::resolve($type, $id));
    }

    public function show(Request $request, string $token): Response
    {
        $import = $this->load($request, $token);
        $set = $import['set'] ? QuestionSet::resolve(...$import['set']) : null;

        return Inertia::render('admin/questions/import-preview', [
            'token' => $token,
            'file' => $import['file'],
            'rows' => $import['rows'],
            'choices' => QuestionImporter::CHOICES,
            'target' => $set
                ? ['kind' => $set->type(), 'title' => $set->set->title, 'url' => route('admin.sets.show', [$set->type(), $set->set->id])]
                : ['kind' => 'bank', 'title' => 'Question bank', 'url' => route('admin.questions.index')],
        ]);
    }

    public function commit(Request $request, string $token): RedirectResponse
    {
        $import = $this->load($request, $token);
        $set = $import['set'] ? QuestionSet::resolve(...$import['set']) : null;
        $choices = $request->validate(['choices' => ['nullable', 'array']])['choices'] ?? [];

        $result = (new QuestionImporter($set))->commit($import['rows'], $choices);
        Cache::forget($this->key($token));

        $message = sprintf(
            '%d new questions added to the bank, %d already in the bank were reused%s, %d skipped.',
            $result['created'],
            $result['reused'] + $result['updated'],
            $result['updated'] ? " ({$result['updated']} with their answer updated)" : '',
            $result['skipped'],
        );

        return $set
            ? to_route('admin.sets.show', [$set->type(), $set->set->id])->with('status', "{$result['added']} questions added to “{$set->set->title}”. {$message}")
            : to_route('admin.questions.index')->with('status', $message);
    }

    public function cancel(Request $request, string $token): RedirectResponse
    {
        $import = $this->load($request, $token);
        Cache::forget($this->key($token));

        return $import['set']
            ? to_route('admin.sets.show', $import['set'])->with('status', 'Import cancelled. Nothing was saved.')
            : to_route('admin.questions.import')->with('status', 'Import cancelled. Nothing was saved.');
    }

    private function upload(Request $request, ?QuestionSet $set): RedirectResponse
    {
        Gate::authorize($set ? 'manage-tests' : 'manage-questions');
        $request->validate(['file' => ['required', 'file', 'mimes:csv,txt', 'max:5120']]);

        $preview = (new QuestionImporter($set))->preview($request->file('file')->getRealPath());

        if ($preview['errors']) {
            return back()->withErrors(['file' => $preview['errors'][0]]);
        }
        if (! $preview['rows']) {
            return back()->withErrors(['file' => 'The file has no question rows.']);
        }

        $token = (string) Str::uuid();
        Cache::put($this->key($token), [
            'user' => $request->user()->id,
            'file' => $request->file('file')->getClientOriginalName(),
            'set' => $set ? [$set->type(), $set->set->id] : null,
            'rows' => $preview['rows'],
        ], now()->addMinutes(self::KEEP_MINUTES));

        return to_route('admin.imports.show', $token);
    }

    /**
     * A preview belongs to the admin who uploaded it, and needs the same access as the upload.
     */
    private function load(Request $request, string $token): array
    {
        $import = Cache::get($this->key($token));
        abort_unless($import && $import['user'] === $request->user()->id, 404, 'This import has expired. Upload the file again.');
        Gate::authorize($import['set'] ? 'manage-tests' : 'manage-questions');

        return $import;
    }

    private function key(string $token): string
    {
        return "question-import:{$token}";
    }
}
