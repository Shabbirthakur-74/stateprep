<?php

use App\Enums\Role;
use App\Http\Controllers\Admin;
use App\Http\Controllers\DoubtImageController;
use App\Http\Controllers\ExamPageController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\LegalController;
use App\Http\Controllers\Student;
use App\Http\Controllers\Student\CheckoutController;
use App\Http\Controllers\Student\PageController as StudentPageController;
use App\Http\Controllers\Student\PassController;
use App\Http\Controllers\Student\QuizController;
use App\Http\Controllers\Student\StudyMaterialController;
use App\Http\Controllers\Student\TestController;
use App\Models\Setting;
use App\Models\User;
use Illuminate\Support\Facades\Route;

// {student} only ever resolves to a student account, {member} only to a team member.
Route::bind('student', fn (string $id) => User::where('role', Role::Student)->findOrFail($id));
Route::bind('member', fn (string $id) => User::whereIn('role', Role::staff())->findOrFail($id));

Route::get('/', HomeController::class)->name('home');
Route::get('exams/{exam:slug}', [ExamPageController::class, 'show'])->name('exams.show');
Route::get('exams/{exam:slug}/buy', [ExamPageController::class, 'buy'])->name('exams.buy');
Route::get('terms', [LegalController::class, 'show'])->defaults('page', 'terms')->name('terms');
Route::get('privacy', [LegalController::class, 'show'])->defaults('page', 'privacy')->name('privacy');
Route::get('user-policy', [LegalController::class, 'show'])->defaults('page', 'user-policy')->name('user-policy');

Route::middleware('auth')->group(function () {
    // Photos on doubts: for the student who asked and the team (checked in the controller).
    Route::get('doubts/{doubt}/image', [DoubtImageController::class, 'doubt'])->name('doubts.image');
    Route::get('doubt-replies/{reply}/image', [DoubtImageController::class, 'reply'])->name('doubts.reply-image');

    // Role-aware entry point: sends each user to their own dashboard.
    Route::get('dashboard', fn () => redirect()->route(auth()->user()->dashboardRoute()))
        ->name('dashboard');

    Route::middleware('role:student')->prefix('student')->name('student.')->group(function () {
        Route::controller(StudentPageController::class)->group(function () {
            Route::get('dashboard', 'home')->name('dashboard');
            Route::get('exams', 'exams')->name('exams');
            Route::get('library', 'library')->name('library');
            Route::get('pyqs', 'pyqs')->name('pyqs');
            Route::get('mock-tests', 'mockTests')->name('mock-tests');
            Route::get('test-series', 'testSeries')->name('test-series');
            Route::get('attempted-tests', 'attemptedTests')->name('attempted-tests');
            Route::get('performance', 'performance')->name('performance');

            foreach (array_keys(StudentPageController::COMING_SOON) as $feature) {
                Route::get($feature, 'comingSoon')->defaults('feature', $feature)->name($feature);
            }
        });

        Route::get('checkout/{exam:slug}', [CheckoutController::class, 'show'])->name('checkout');
        Route::get('pass', [PassController::class, 'show'])->name('pass');
        Route::get('pass/checkout/{plan}', [PassController::class, 'checkout'])->whereIn('plan', array_keys(Setting::PASS_PLANS))->name('pass.checkout');

        Route::controller(Student\DoubtController::class)->prefix('doubts')->group(function () {
            Route::get('/', 'index')->name('doubts');
            Route::post('/', 'store')->name('doubts.store');
            Route::get('{doubt}', 'show')->name('doubts.show');
            Route::post('{doubt}/reply', 'reply')->name('doubts.reply');
            Route::post('{doubt}/resolve', 'resolve')->name('doubts.resolve');
        });

        Route::controller(StudyMaterialController::class)->prefix('study-material')->group(function () {
            Route::get('/', 'index')->name('study-material');
            Route::get('{material}', 'show')->name('study-material.show');
            Route::get('{material}/file', 'file')->name('study-material.file');
            Route::post('{material}/save', 'save')->name('study-material.save');
            Route::delete('{material}/save', 'unsave')->name('study-material.unsave');
        });

        Route::controller(QuizController::class)->prefix('quizzes')->group(function () {
            Route::get('/', 'index')->name('quizzes');
            Route::post('/', 'start')->name('quizzes.start');
            Route::post('ready/{quiz}', 'startReady')->name('quizzes.ready');
            Route::get('{attempt}', 'show')->whereNumber('attempt')->name('quizzes.show');
            Route::put('{attempt}/answer', 'answer')->whereNumber('attempt')->name('quizzes.answer');
            Route::post('{attempt}/finish', 'finish')->whereNumber('attempt')->name('quizzes.finish');
        });

        Route::controller(TestController::class)->group(function () {
            Route::get('test-series/{series}', 'series')->name('test-series.show');
            Route::post('tests/{mockTest}/start', 'start')->name('tests.start');
            Route::get('tests/attempts/{attempt}', 'show')->name('tests.show');
            Route::put('tests/attempts/{attempt}/answer', 'answer')->name('tests.answer');
            Route::post('tests/attempts/{attempt}/submit', 'submit')->name('tests.submit');
        });
    });

    Route::middleware('role:super_admin,staff')->prefix('admin')->name('admin.')->group(function () {
        Route::get('dashboard', Admin\DashboardController::class)->name('dashboard');

        Route::controller(Admin\QuestionImportController::class)->prefix('imports/{token}')->name('imports.')->group(function () {
            Route::get('/', 'show')->name('show');
            Route::post('/', 'commit')->name('commit');
            Route::delete('/', 'cancel')->name('cancel');
        });

        Route::middleware('can:manage-team')->group(function () {
            Route::resource('team', Admin\TeamController::class)->except('show')->parameters(['team' => 'member']);
        });

        Route::middleware('can:manage-exams')->group(function () {
            Route::resource('exams', Admin\ExamController::class)->except('show');
            Route::get('exams/{exam}/content', [Admin\ExamController::class, 'content'])->name('exams.content');
        });

        Route::middleware('can:manage-questions')->group(function () {
            Route::controller(Admin\SubjectController::class)->group(function () {
                Route::get('subjects', 'index')->name('subjects.index');
                Route::post('subjects', 'store')->name('subjects.store');
                Route::put('subjects/{subject}', 'update')->name('subjects.update');
                Route::delete('subjects/{subject}', 'destroy')->name('subjects.destroy');
                Route::post('subjects/{subject}/topics', 'storeTopic')->name('topics.store');
                Route::put('topics/{topic}', 'updateTopic')->name('topics.update');
                Route::post('topics/{topic}/move', 'moveTopic')->name('topics.move');
                Route::delete('topics/{topic}', 'destroyTopic')->name('topics.destroy');
            });

            Route::controller(Admin\QuestionController::class)->group(function () {
                Route::get('questions/import', 'importForm')->name('questions.import');
                Route::get('questions/import/template', 'template')->name('questions.template');
            });
            Route::post('questions/import', [Admin\QuestionImportController::class, 'bank'])->name('questions.import.store');
            Route::get('questions/duplicates', [Admin\QuestionDuplicateController::class, 'index'])->name('questions.duplicates');
            Route::post('questions/merge', [Admin\QuestionDuplicateController::class, 'merge'])->name('questions.merge');
            Route::resource('questions', Admin\QuestionController::class)->except('show');
        });

        Route::middleware('can:manage-tests')->group(function () {
            Route::resource('mock-tests', Admin\MockTestController::class)->except('show');
            Route::post('quizzes/generate', [Admin\QuizController::class, 'generate'])->name('quizzes.generate');
            Route::post('quizzes/publish', [Admin\QuizController::class, 'publish'])->name('quizzes.publish');
            Route::resource('quizzes', Admin\QuizController::class)->except('show');
            Route::controller(Admin\QuestionSetController::class)->prefix('sets/{type}/{id}')->whereIn('type', ['mock-test', 'quiz'])->whereNumber('id')->name('sets.')->group(function () {
                Route::get('/', 'show')->name('show');
                Route::post('draw', 'draw')->name('draw');
                Route::post('add', 'add')->name('add');
                Route::delete('/', 'clear')->name('clear');
                Route::post('{question}/swap', 'swap')->name('swap');
                Route::post('{question}/move', 'move')->name('move');
                Route::delete('{question}', 'remove')->name('remove');
            });
            Route::post('sets/{type}/{id}/import', [Admin\QuestionImportController::class, 'set'])->whereIn('type', ['mock-test', 'quiz'])->name('sets.import');
            Route::resource('test-series', Admin\TestSeriesController::class)->except('show')->parameters(['test-series' => 'series']);
        });

        Route::middleware('can:manage-materials')->group(function () {
            Route::resource('materials', Admin\StudyMaterialController::class)->except('show');
        });

        Route::middleware('can:manage-homepage')->controller(Admin\HomepageController::class)->group(function () {
            Route::get('homepage', 'index')->name('homepage.index');
            Route::put('homepage/text', 'updateText')->name('homepage.text');
            Route::put('homepage/exams', 'updateExams')->name('homepage.exams');
            Route::post('homepage/cards', 'storeCard')->name('homepage.cards.store');
            Route::put('homepage/cards/{card}', 'updateCard')->name('homepage.cards.update');
            Route::post('homepage/cards/{card}/move', 'moveCard')->name('homepage.cards.move');
            Route::delete('homepage/cards/{card}', 'destroyCard')->name('homepage.cards.destroy');
        });

        Route::middleware('can:manage-doubts')->controller(Admin\DoubtController::class)->group(function () {
            Route::get('doubts', 'index')->name('doubts.index');
            Route::get('doubts/{doubt}', 'show')->name('doubts.show');
            Route::post('doubts/{doubt}/reply', 'reply')->name('doubts.reply');
            Route::post('doubts/{doubt}/status', 'status')->name('doubts.status');
        });

        Route::middleware('can:manage-notices')->group(function () {
            Route::resource('notices', Admin\NoticeController::class)->except('show');
        });

        Route::middleware('can:manage-students')->group(function () {
            Route::resource('students', Admin\StudentController::class)->only(['index', 'show', 'destroy']);
        });

        Route::middleware('can:manage-settings')->group(function () {
            Route::get('settings', [Admin\SettingsController::class, 'edit'])->name('settings.edit');
            Route::put('settings', [Admin\SettingsController::class, 'update'])->name('settings.update');
        });
    });
});

require __DIR__.'/auth.php';
