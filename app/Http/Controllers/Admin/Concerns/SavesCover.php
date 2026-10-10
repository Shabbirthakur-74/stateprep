<?php

namespace App\Http\Controllers\Admin\Concerns;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

/**
 * Handles the "cover" upload and the "remove_cover" tick box on admin forms.
 */
trait SavesCover
{
    /** Validation rules for the cover fields. */
    protected function coverRules(): array
    {
        return [
            'cover' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:4096'],
            'remove_cover' => ['nullable', 'boolean'],
        ];
    }

    protected function saveCover(Model $model, Request $request): void
    {
        if (($request->boolean('remove_cover') || $request->hasFile('cover')) && $model->cover_path) {
            Storage::disk('public')->delete($model->cover_path);
            $model->cover_path = null;
        }

        if ($request->hasFile('cover')) {
            $model->cover_path = $request->file('cover')->store('covers', 'public');
        }

        $model->save();
    }

    /** Free/paid rules shared by tests, series and material. */
    protected function priceRules(): array
    {
        return [
            'is_free' => ['required', 'boolean'],
            'price' => ['nullable', 'required_if:is_free,0,false', 'numeric', 'min:1', 'max:99999'],
            'is_published' => ['required', 'boolean'],
        ];
    }
}
