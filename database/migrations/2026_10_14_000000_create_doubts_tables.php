<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Students' doubts and the conversation about each one with the team.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('doubts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('subject_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('topic_id')->nullable()->constrained()->nullOnDelete();
            // A test or quiz question the doubt is about.
            $table->foreignId('question_id')->nullable()->constrained()->nullOnDelete();
            $table->text('body');
            $table->string('image_path')->nullable();
            $table->string('status', 10)->default('open'); // open | answered | closed
            $table->dateTime('last_activity_at');
            // When the student last opened the conversation, for the unread badge.
            $table->dateTime('student_seen_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'last_activity_at']);
        });

        Schema::create('doubt_replies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('doubt_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->text('body');
            $table->string('image_path')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('doubt_replies');
        Schema::dropIfExists('doubts');
    }
};
