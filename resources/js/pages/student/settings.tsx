import { FlashStatus } from '@/components/flash-status';
import { ProfileForm, type ProfileOptions, type ProfileValues } from '@/components/profile-form';
import { Eyebrow, PageHeading, Panel } from '@/components/student-kit';
import StudentLayout from '@/layouts/student-layout';
import { Settings as SettingsIcon, UserRound } from 'lucide-react';

interface Props {
    account: { name: string; email: string; joined: string };
    options: ProfileOptions;
    /** Null until the first-time details popup has been filled in. */
    profile: ProfileValues | null;
}

/**
 * The student's account and the details given after sign-up, editable at any time.
 */
export default function Settings({ account, options, profile }: Props) {
    return (
        <StudentLayout title="Settings">
            <div className="mx-auto max-w-3xl space-y-6">
                <PageHeading
                    eyebrow={<Eyebrow icon={SettingsIcon}>Account</Eyebrow>}
                    title="Settings"
                    description="Keep your details up to date so we can show the right exams and reach you about results and new tests."
                />

                <div className="empty:hidden">
                    <FlashStatus />
                </div>

                <Panel>
                    <h2 className="flex items-center gap-2 font-semibold">
                        <UserRound className="size-4 text-indigo-600" /> Account
                    </h2>
                    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-3">
                        {[
                            ['Name', account.name],
                            ['Email', account.email],
                            [
                                'Member since',
                                new Date(account.joined).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
                            ],
                        ].map(([label, value]) => (
                            <div key={label} className="min-w-0">
                                <dt className="text-muted-foreground text-xs">{label}</dt>
                                <dd className="truncate font-medium">{value}</dd>
                            </div>
                        ))}
                    </dl>
                </Panel>

                <Panel>
                    <h2 className="font-semibold">Your details</h2>
                    <p className="text-muted-foreground mt-1 text-sm">Change anything and press Save changes.</p>
                    <div className="mt-5">
                        {/* Keyed on the saved values, so the form starts from them again after saving. */}
                        <ProfileForm key={JSON.stringify(profile)} options={options} initial={profile ?? undefined} submitLabel="Save changes" />
                    </div>
                </Panel>
            </div>
        </StudentLayout>
    );
}
