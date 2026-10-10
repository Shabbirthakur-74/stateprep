<?php

namespace App\Enums;

/**
 * Admin sections a super admin can hand to a team member. Managing the team itself is reserved for super admins.
 */
enum Permission: string
{
    case Exams = 'manage-exams';
    case Questions = 'manage-questions';
    case Tests = 'manage-tests';
    case Materials = 'manage-materials';
    case Homepage = 'manage-homepage';
    case Notices = 'manage-notices';
    case Students = 'manage-students';
    case Settings = 'manage-settings';

    public function label(): string
    {
        return match ($this) {
            self::Exams => 'Exams',
            self::Questions => 'Question Bank',
            self::Tests => 'Mock Tests, PYQs, Series & Quizzes',
            self::Materials => 'Study Material',
            self::Homepage => 'Homepage',
            self::Notices => 'Notice Board',
            self::Students => 'Students',
            self::Settings => 'Settings',
        };
    }

    public function description(): string
    {
        return match ($this) {
            self::Exams => 'Add and edit exams, their public exam pages and prices, and the subjects each exam covers.',
            self::Questions => 'Manage subjects, topics and questions, including bulk CSV import.',
            self::Tests => 'Create, publish and delete mock tests, previous year papers, test series and quizzes, and choose their questions.',
            self::Materials => 'Upload and publish notes, PDFs and links.',
            self::Homepage => 'Choose the exams, test series and study material shown on the homepage, and edit its headings.',
            self::Notices => 'Post exam notifications and announcements on the notice board.',
            self::Students => 'View student accounts and their results, and delete accounts.',
            self::Settings => 'Change site settings such as result cut-offs.',
        };
    }

    /**
     * @return list<array{value: string, label: string, description: string}>
     */
    public static function options(): array
    {
        return array_map(fn (self $p) => ['value' => $p->value, 'label' => $p->label(), 'description' => $p->description()], self::cases());
    }
}
