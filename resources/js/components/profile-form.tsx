import { AuthField } from '@/components/auth-field';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useClientValidation } from '@/lib/auth-validation';
import { selectClass } from '@/lib/form-styles';
import { dateOfBirthError, districtError, examsError, normalizePhone, optionError, phoneError } from '@/lib/profile-validation';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import { Check, LoaderCircle } from 'lucide-react';
import { FormEventHandler, ReactNode } from 'react';

/** The choices, from StudentProfile::options() on the server. */
export interface ProfileOptions {
    districts: string[];
    genders: string[];
    qualifications: string[];
    exams: { id: number; name: string }[];
}

type Field = 'phone' | 'date_of_birth' | 'district' | 'exam_ids' | 'gender' | 'qualification';

const shortName = (name: string) => name.replace(/\s*\(.*\)\s*$/, '') || name;

function SelectField({
    id,
    label,
    error,
    children,
    ...select
}: { id: string; label: string; error?: string; children: ReactNode } & React.SelectHTMLAttributes<HTMLSelectElement>) {
    return (
        <div className="grid gap-2">
            <Label htmlFor={id}>{label}</Label>
            <select
                id={id}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? `${id}-error` : undefined}
                className={cn(selectClass, 'w-full', error && 'border-red-500')}
                {...select}
            >
                {children}
            </select>
            <InputError id={`${id}-error`} message={error} />
        </div>
    );
}

/** Saved details, from ProfileController::edit(). */
export interface ProfileValues {
    phone: string;
    date_of_birth: string;
    district: string;
    exam_ids: number[];
    gender: string;
    qualification: string;
}

/**
 * The student's details: mobile number, date of birth, district and the exams they are preparing for (gender and
 * qualification optional). Used by the first-time popup after sign-up and by the Settings page to edit them later.
 * The same checks and messages run on the server (Student\\ProfileController).
 */
export function ProfileForm({ options, initial, submitLabel }: { options: ProfileOptions; initial?: ProfileValues; submitLabel: string }) {
    const { data, setData, put, processing, errors, clearErrors, transform, isDirty } = useForm({
        phone: initial?.phone ?? '',
        date_of_birth: initial?.date_of_birth ?? '',
        district: initial?.district ?? '',
        exam_ids: initial?.exam_ids ?? ([] as number[]),
        gender: initial?.gender ?? '',
        qualification: initial?.qualification ?? '',
    });
    const serverErrors = errors as Partial<Record<string, string>>;

    const { errorFor, touch, check } = useClientValidation<Field>(
        {
            phone: phoneError(data.phone),
            date_of_birth: dateOfBirthError(data.date_of_birth),
            district: districtError(data.district, options.districts),
            exam_ids: examsError(
                data.exam_ids,
                options.exams.map((e) => e.id),
            ),
            gender: optionError(data.gender, options.genders),
            qualification: optionError(data.qualification, options.qualifications),
        },
        {
            phone: 'profile-phone',
            date_of_birth: 'profile-dob',
            district: 'profile-district',
            exam_ids: 'profile-exam-first',
            gender: 'profile-gender',
            qualification: 'profile-qualification',
        },
    );
    // A browser error first; otherwise the server's (including "exam_ids.0"-style keys for the exam list).
    const errorOf = (field: Field) =>
        errorFor(field) ??
        serverErrors[field] ??
        (field === 'exam_ids' ? Object.entries(serverErrors).find(([k]) => k.startsWith('exam_ids.'))?.[1] : undefined);

    const change = <K extends Field>(field: K, value: (typeof data)[K]) => {
        setData(field, value);
        clearErrors(field);
    };

    const toggleExam = (id: number) => {
        change('exam_ids', data.exam_ids.includes(id) ? data.exam_ids.filter((e) => e !== id) : [...data.exam_ids, id]);
        touch('exam_ids');
    };

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        if (!check()) return;
        transform((d) => ({ ...d, phone: normalizePhone(d.phone) }));
        put(route('student.profile.update'), { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} noValidate className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <AuthField
                    id="profile-phone"
                    label="Mobile number"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel-national"
                    placeholder="98765 43210"
                    value={data.phone}
                    onChange={(e) => change('phone', e.target.value)}
                    onBlur={() => touch('phone')}
                    error={errorOf('phone')}
                />
                <AuthField
                    id="profile-dob"
                    label="Date of birth"
                    type="date"
                    autoComplete="bday"
                    value={data.date_of_birth}
                    onChange={(e) => change('date_of_birth', e.target.value)}
                    onBlur={() => touch('date_of_birth')}
                    error={errorOf('date_of_birth')}
                />
                <SelectField
                    id="profile-district"
                    label="District"
                    value={data.district}
                    onChange={(e) => change('district', e.target.value)}
                    onBlur={() => touch('district')}
                    error={errorOf('district')}
                >
                    <option value="">Choose your district</option>
                    {options.districts.map((d) => (
                        <option key={d}>{d}</option>
                    ))}
                </SelectField>
                <SelectField
                    id="profile-gender"
                    label="Gender (optional)"
                    value={data.gender}
                    onChange={(e) => change('gender', e.target.value)}
                    error={errorOf('gender')}
                >
                    <option value="">Choose…</option>
                    {options.genders.map((g) => (
                        <option key={g}>{g}</option>
                    ))}
                </SelectField>
                <div className="sm:col-span-2">
                    <SelectField
                        id="profile-qualification"
                        label="Highest qualification (optional)"
                        value={data.qualification}
                        onChange={(e) => change('qualification', e.target.value)}
                        error={errorOf('qualification')}
                    >
                        <option value="">Choose…</option>
                        {options.qualifications.map((q) => (
                            <option key={q}>{q}</option>
                        ))}
                    </SelectField>
                </div>
            </div>

            <fieldset className="grid gap-2" aria-describedby={errorOf('exam_ids') ? 'profile-exams-error' : undefined}>
                <legend className="mb-2 text-sm font-medium">Exams you are preparing for</legend>
                {options.exams.length === 0 ? (
                    <p className="text-muted-foreground text-sm">Exams are being added. You can choose them later.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {options.exams.map((exam, i) => {
                            const on = data.exam_ids.includes(exam.id);
                            return (
                                <button
                                    key={exam.id}
                                    id={i === 0 ? 'profile-exam-first' : undefined}
                                    type="button"
                                    role="checkbox"
                                    aria-checked={on}
                                    title={exam.name}
                                    onClick={() => toggleExam(exam.id)}
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors',
                                        on ? 'border-indigo-600 bg-indigo-600 text-white' : 'hover:border-indigo-400',
                                        errorOf('exam_ids') && !on && 'border-red-400',
                                    )}
                                >
                                    {on && <Check className="size-3.5" />} {shortName(exam.name)}
                                </button>
                            );
                        })}
                    </div>
                )}
                <InputError id="profile-exams-error" message={errorOf('exam_ids')} />
            </fieldset>

            <Button
                type="submit"
                className={cn('mt-2 bg-indigo-600 hover:bg-indigo-700', initial ? 'justify-self-start' : 'w-full')}
                disabled={processing || (!!initial && !isDirty)}
            >
                {processing && <LoaderCircle className="size-4 animate-spin" />}
                {submitLabel}
            </Button>
        </form>
    );
}
