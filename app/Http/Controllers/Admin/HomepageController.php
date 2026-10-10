<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Exam;
use App\Models\HomeCard;
use App\Models\MockTest;
use App\Models\Setting;
use App\Models\StudyMaterial;
use App\Models\TestSeries;
use App\Services\PublicCatalog;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/**
 * The homepage: section headings, which exams appear under "Exams We Cover" and in what order,
 * and the cards of the test series and study material carousels. The notice board has its own section.
 */
class HomepageController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('admin/homepage', [
            'text' => Setting::homepageText(),
            'exams' => Exam::orderBy('home_position')->orderBy('name')->get()
                ->map(fn (Exam $exam) => $exam->only('id', 'name', 'slug', 'is_active', 'show_on_home')),
            'cards' => collect(HomeCard::SECTIONS)->mapWithKeys(fn ($section) => [
                $section => HomeCard::forSection($section)->filter(fn (HomeCard $card) => $card->cardable)->map(fn (HomeCard $card) => [
                    ...$card->only('id', 'badge', 'tag', 'cardable_type', 'cardable_id'),
                    'highlights' => $card->highlights ?? [],
                    'title' => $card->cardable->title,
                    'exam' => $card->cardable->exam?->name,
                    'kind' => $this->kindLabel($card->cardable),
                    'live' => PublicCatalog::isPublic($card->cardable),
                ])->values(),
            ]),
            'options' => [
                'tests' => [
                    ...TestSeries::with('exam:id,name')->orderBy('title')->get()->map(fn ($s) => $this->option($s)),
                    ...MockTest::with('exam:id,name')->orderBy('title')->get()->map(fn ($t) => $this->option($t)),
                ],
                'materials' => StudyMaterial::with('exam:id,name')->orderBy('title')->get()->map(fn ($m) => $this->option($m))->all(),
            ],
            'badges' => HomeCard::BADGES,
        ]);
    }

    public function updateText(Request $request): RedirectResponse
    {
        $data = $request->validate(collect(Setting::HOMEPAGE_TEXT)->mapWithKeys(fn ($key) => [
            $key => ['required', 'string', str_ends_with($key, 'description') ? 'max:300' : 'max:80'],
        ])->all());

        Setting::put($data);

        return back()->with('status', 'Homepage headings saved.');
    }

    /**
     * Saves the "Exams We Cover" list: every exam in its new order, with whether it is shown.
     */
    public function updateExams(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'exams' => ['required', 'array'],
            'exams.*.id' => ['required', 'integer', 'distinct', 'exists:exams,id'],
            'exams.*.show_on_home' => ['required', 'boolean'],
        ]);

        foreach ($data['exams'] as $position => $row) {
            Exam::whereKey($row['id'])->update(['home_position' => $position + 1, 'show_on_home' => $row['show_on_home']]);
        }

        return back()->with('status', 'Exams We Cover saved.');
    }

    public function storeCard(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'section' => ['required', Rule::in(HomeCard::SECTIONS)],
            'cardable_type' => ['required', 'string'],
            'cardable_id' => ['required', 'integer'],
            ...$this->extrasRules(),
        ]);

        abort_unless(in_array($data['cardable_type'], HomeCard::TYPES[$data['section']], true), 422);
        Relation::getMorphedModel($data['cardable_type'])::findOrFail($data['cardable_id']);

        $exists = HomeCard::where($request->only('section', 'cardable_type', 'cardable_id'))->exists();
        if ($exists) {
            return back()->withErrors(['cardable_id' => 'This item is already in the carousel.']);
        }

        HomeCard::create([
            ...$this->extras($data),
            ...collect($data)->only('section', 'cardable_type', 'cardable_id')->all(),
            'position' => (int) HomeCard::where('section', $data['section'])->max('position') + 1,
        ]);

        return back()->with('status', 'Card added to the homepage.');
    }

    public function updateCard(Request $request, HomeCard $card): RedirectResponse
    {
        $card->update($this->extras($request->validate($this->extrasRules())));

        return back()->with('status', 'Card saved.');
    }

    public function moveCard(Request $request, HomeCard $card): RedirectResponse
    {
        $request->validate(['direction' => ['required', Rule::in(['up', 'down'])]]);

        $cards = HomeCard::where('section', $card->section)->orderBy('position')->orderBy('id')->get()->values();
        $index = $cards->search(fn (HomeCard $c) => $c->is($card));
        $swap = $index + ($request->input('direction') === 'up' ? -1 : 1);

        if ($swap >= 0 && $swap < $cards->count()) {
            $ordered = $cards->all();
            [$ordered[$index], $ordered[$swap]] = [$ordered[$swap], $ordered[$index]];
            foreach ($ordered as $position => $c) {
                $c->update(['position' => $position + 1]);
            }
        }

        return back();
    }

    public function destroyCard(HomeCard $card): RedirectResponse
    {
        $card->delete();

        return back()->with('status', 'Card removed from the homepage.');
    }

    private function extrasRules(): array
    {
        return [
            'badge' => ['nullable', Rule::in(HomeCard::BADGES)],
            'tag' => ['nullable', 'string', 'max:40'],
            'highlights' => ['nullable', 'array', 'max:3'],
            'highlights.*' => ['nullable', 'string', 'max:30'],
        ];
    }

    private function extras(array $data): array
    {
        return [
            'badge' => $data['badge'] ?? null,
            'tag' => $data['tag'] ?? null,
            'highlights' => array_values(array_filter(array_map('trim', $data['highlights'] ?? []))),
        ];
    }

    private function option($item): array
    {
        return [
            'type' => $item->getMorphClass(),
            'id' => $item->id,
            'label' => $item->title,
            'kind' => $this->kindLabel($item),
            'exam' => $item->exam?->name,
            'published' => (bool) $item->is_published,
        ];
    }

    private function kindLabel($item): string
    {
        return match (true) {
            $item instanceof TestSeries => 'Test series',
            $item instanceof MockTest => $item->type === 'pyq' ? 'PYQ paper' : 'Mock test',
            default => 'Study material',
        };
    }
}
