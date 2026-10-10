<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Removes the tables and columns behind features that were taken out: test taking and results,
 * student profiles, My library, paid-access grants, custom admin roles and account suspension.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('attempt_answers');
        Schema::dropIfExists('test_attempts');
        Schema::dropIfExists('library_items');
        Schema::dropIfExists('material_access');
        Schema::dropIfExists('test_access');
        Schema::dropIfExists('exam_user');
        Schema::dropIfExists('student_profiles');

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('admin_role_id');
            $table->dropColumn('suspended_at');
        });

        Schema::dropIfExists('admin_roles');
    }

    public function down(): void
    {
        // The removed features are gone; there is nothing to restore them into.
    }
};
