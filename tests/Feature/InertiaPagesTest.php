<?php

use Illuminate\Support\Facades\File;

/**
 * Windows paths are not case-sensitive, Linux (CI) paths are: "admin/Dashboard" would work locally and fail in CI.
 * This compares every page name the app renders with the real file names, letter for letter, on any system.
 */
test('every rendered page component exists with the exact same letter case', function () {
    $pagesRoot = config('inertia.testing.page_paths')[0];

    // Real file names as stored on disk (relative, without extension, forward slashes).
    $pages = collect(File::allFiles($pagesRoot))
        ->map(fn ($file) => str_replace('\\', '/', substr($file->getRelativePathname(), 0, -strlen('.'.$file->getExtension()))))
        ->all();

    // The directory itself must be spelled exactly like the configured path.
    expect(scandir(dirname($pagesRoot)))->toContain(basename($pagesRoot));

    $rendered = collect(File::allFiles(app_path()))
        ->flatMap(fn ($file) => preg_match_all("/Inertia::render\\(\\s*'([^']+)'/", $file->getContents(), $m) ? $m[1] : [])
        ->unique()
        ->values();

    expect($rendered)->not->toBeEmpty();
    foreach ($rendered as $name) {
        expect($pages)->toContain($name);
    }
});
