<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_roles', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('description', 500)->nullable();
            $table->json('permissions');
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('admin_role_id')->nullable()->after('role')->constrained('admin_roles')->restrictOnDelete();
        });

        // The fixed "admin" and "editor" levels become ordinary, editable roles.
        $now = now();
        $defaults = [
            'admin' => ['Admin', 'Manages students, exams, questions, tests and reports.', ['manage-students', 'manage-exams', 'manage-questions', 'manage-tests', 'view-reports']],
            'editor' => ['Editor', 'Manages exams, subjects and the question bank only.', ['manage-exams', 'manage-questions']],
        ];

        foreach ($defaults as $oldRole => [$name, $description, $permissions]) {
            $id = DB::table('admin_roles')->insertGetId([
                'name' => $name,
                'description' => $description,
                'permissions' => json_encode($permissions),
                'created_at' => $now,
                'updated_at' => $now,
            ]);

            DB::table('users')->where('role', $oldRole)->update(['role' => 'staff', 'admin_role_id' => $id]);
        }
    }

    public function down(): void
    {
        $names = DB::table('admin_roles')->pluck('name', 'id');

        foreach (DB::table('users')->where('role', 'staff')->get(['id', 'admin_role_id']) as $user) {
            DB::table('users')->where('id', $user->id)->update([
                'role' => strtolower($names[$user->admin_role_id] ?? '') === 'editor' ? 'editor' : 'admin',
            ]);
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('admin_role_id');
        });

        Schema::dropIfExists('admin_roles');
    }
};
