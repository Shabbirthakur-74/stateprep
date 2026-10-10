<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Exam notifications for the notice board: recruitment notices, admit cards, results, answer keys.
        // A notice without an exam is a general announcement.
        Schema::create('notices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('exam_id')->nullable()->constrained()->nullOnDelete();
            $table->string('category');
            $table->string('title');
            $table->string('url', 2048)->nullable();
            $table->date('published_on');
            $table->boolean('is_pinned')->default(false);
            $table->boolean('is_published')->default(true);
            $table->timestamps();

            $table->index(['is_published', 'published_on']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notices');
    }
};
