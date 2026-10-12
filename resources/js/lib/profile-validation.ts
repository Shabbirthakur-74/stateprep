/**
 * Checks for the student details form shown after sign-up. The server runs the same checks with the same messages
 * (App\Rules\IndianMobile, App\Rules\DateOfBirth and Student\ProfileController): change both together.
 */

export const MIN_AGE = 12;
const MAX_AGE = 80;

/** The 10 digits: "+91 98765-43210", "098765 43210" and "9876543210" all become "9876543210". */
export function normalizePhone(value: string): string {
    const digits = value.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
    return digits;
}

/** Same checks, order and messages as App\Rules\IndianMobile. */
export function phoneError(value: string): string | undefined {
    const phone = value.trim();
    if (!phone) return 'Enter your mobile number.';
    if (/[^\d\s()+-]/.test(phone)) return 'The mobile number can only contain digits.';
    if (!/^[6-9]\d{9}$/.test(normalizePhone(phone))) return 'Enter a valid 10-digit mobile number starting with 6, 7, 8 or 9.';
    return undefined;
}

/** Today as YYYY-MM-DD in the student's own time zone. */
const todayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/** Same checks, order and messages as App\Rules\DateOfBirth. `value` is YYYY-MM-DD, as the date picker gives it. */
export function dateOfBirthError(value: string, today: string = todayIso()): string | undefined {
    const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!value.trim()) return 'Enter your date of birth.';
    if (!match) return 'Enter a valid date of birth.';

    const [y, m, d] = match.slice(1).map(Number);
    const real = new Date(Date.UTC(y, m - 1, d));
    if (real.getUTCFullYear() !== y || real.getUTCMonth() !== m - 1 || real.getUTCDate() !== d) return 'Enter a valid date of birth.';

    const [ty, tm, td] = today.split('-').map(Number);
    if (y > ty || (y === ty && (m > tm || (m === tm && d > td)))) return 'The date of birth cannot be in the future.';

    const age = ty - y - (tm < m || (tm === m && td < d) ? 1 : 0);
    if (age < MIN_AGE) return `You must be at least ${MIN_AGE} years old.`;
    if (age > MAX_AGE) return 'Enter a valid date of birth.';
    return undefined;
}

export function districtError(value: string, districts: string[]): string | undefined {
    if (!value) return 'Choose your district.';
    if (!districts.includes(value)) return 'Choose a district from the list.';
    return undefined;
}

/** Required whenever there are exams to choose from, like the server. */
export function examsError(ids: number[], allowed: number[]): string | undefined {
    if (ids.length === 0) return allowed.length ? 'Choose at least one exam you are preparing for.' : undefined;
    if (ids.some((id) => !allowed.includes(id))) return 'Choose exams from the list.';
    return undefined;
}

/** Optional choices (gender, qualification): empty is fine, anything else must come from the list. */
export function optionError(value: string, options: string[]): string | undefined {
    return value && !options.includes(value) ? 'Choose an option from the list.' : undefined;
}
