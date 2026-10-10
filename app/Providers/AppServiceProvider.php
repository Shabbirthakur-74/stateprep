<?php

namespace App\Providers;

use App\Enums\Permission;
use App\Models\MockTest;
use App\Models\StudyMaterial;
use App\Models\TestSeries;
use App\Models\User;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Short names for the content a homepage card can point at.
        Relation::morphMap([
            'test_series' => TestSeries::class,
            'mock_test' => MockTest::class,
            'study_material' => StudyMaterial::class,
        ]);

        // One gate per admin section, so routes can use `can:manage-questions` etc.
        foreach (Permission::cases() as $permission) {
            Gate::define($permission->value, fn (User $user) => $user->hasPermission($permission));
        }

        // Only super admins add team members and decide what they can access.
        Gate::define('manage-team', fn (User $user) => $user->isSuperAdmin());
    }
}
