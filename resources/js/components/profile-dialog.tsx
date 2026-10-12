import { ProfileForm, type ProfileOptions } from '@/components/profile-form';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserRoundPen } from 'lucide-react';

/**
 * Asked once, right after sign-up. It stays open until the details are saved; they can be changed later under
 * Settings.
 */
export function ProfileDialog({ options }: { options: ProfileOptions }) {
    return (
        <Dialog open>
            <DialogContent
                hideClose
                className="max-h-[92vh] overflow-y-auto sm:max-w-xl"
                onEscapeKeyDown={(e) => e.preventDefault()}
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
            >
                <DialogHeader>
                    <span className="mb-1 flex size-11 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-300">
                        <UserRoundPen className="size-5" />
                    </span>
                    <DialogTitle>Tell us a little about yourself</DialogTitle>
                    <DialogDescription>
                        This helps us show the right exams and keep in touch about results and new tests. It only takes a minute.
                    </DialogDescription>
                </DialogHeader>
                <ProfileForm options={options} submitLabel="Save and continue" />
            </DialogContent>
        </Dialog>
    );
}
