import { useState } from 'react';

/**
 * Checks for the login and sign-up forms, run in the browser before anything is sent. The server runs the same checks
 * with the same messages (App\Rules\ValidEmail, PersonName, StrongPassword, PasswordConfirmation): change both together.
 */

/** Same limits as the server. */
export const PASSWORD_MIN = 8;
const MAX_LENGTH = 255;

// Something@domain.tld: no spaces, one @, and a dot in the domain followed by at least two letters.
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)*\.[a-zA-Z]{2,}$/;
// Letters of any script, spaces, dots, apostrophes and hyphens: "Asha", "R. K. Sharma", "D'Souza", "Anne-Marie".
const NAME = /^[\p{L}\p{M}][\p{L}\p{M} .'’-]*$/u;

/** Same checks, order and messages as App\Rules\ValidEmail. */
export function emailError(value: string): string | undefined {
    const email = value.trim();
    if (!email) return 'Enter your email address.';
    if (/\s/.test(email)) return 'An email address cannot contain spaces.';
    if (email.length > MAX_LENGTH) return `The email address must be ${MAX_LENGTH} characters or fewer.`;
    if (!EMAIL.test(email)) return 'Enter a valid email address, like name@example.com.';
    return undefined;
}

/** Same checks, order and messages as App\Rules\PersonName. */
export function nameError(value: string): string | undefined {
    const name = value.trim();
    if (!name) return 'Enter your name.';
    if (name.length < 2) return 'Your name must be at least 2 characters.';
    if (name.length > MAX_LENGTH) return `Your name must be ${MAX_LENGTH} characters or fewer.`;
    if (!NAME.test(name)) return 'Use letters only (spaces, dots, apostrophes and hyphens are fine).';
    return undefined;
}

/** Login: the password only has to be filled in. */
export function passwordError(value: string): string | undefined {
    return value ? undefined : 'Enter your password.';
}

const CAPITAL = /\p{Lu}/u;
const NUMBER = /\p{N}/u;
// Anything that is not a letter, a number or a space: ! @ # $ % ^ & * ( ) - _ = + . , ? / and so on.
const SPECIAL = /[^\p{L}\p{N}\s]/u;

/**
 * Sign-up: a new password. Same checks, order and messages as App\Rules\StrongPassword on the server.
 */
export function newPasswordError(value: string): string | undefined {
    if (!value) return 'Choose a password.';
    if (!value.trim()) return 'The password cannot be only spaces.';
    if (value.length < PASSWORD_MIN) return `The password must be at least ${PASSWORD_MIN} characters.`;
    if (value.length > MAX_LENGTH) return `The password must be ${MAX_LENGTH} characters or fewer.`;
    if (!CAPITAL.test(value)) return 'The password must contain at least one capital letter.';
    if (!NUMBER.test(value)) return 'The password must contain at least one number.';
    if (!SPECIAL.test(value)) return 'The password must contain at least one special character, like ! @ # $ %.';
    return undefined;
}

/** The password requirements as a checklist that ticks off while typing. */
export function passwordChecklist(value: string): { label: string; met: boolean }[] {
    return [
        { label: `At least ${PASSWORD_MIN} characters`, met: value.length >= PASSWORD_MIN },
        { label: 'A capital letter (A–Z)', met: CAPITAL.test(value) },
        { label: 'A number (0–9)', met: NUMBER.test(value) },
        { label: 'A special character, like ! @ # $ %', met: SPECIAL.test(value) },
    ];
}

/** Same messages as App\Rules\PasswordConfirmation. */
export function confirmationError(password: string, confirmation: string): string | undefined {
    if (!confirmation) return 'Type your password again.';
    if (confirmation !== password) return 'The passwords do not match.';
    return undefined;
}

/** Emails are stored in lower case (the server refuses capitals), so they are tidied before sending. */
export const normalizeEmail = (value: string) => value.trim().toLowerCase();

type Errors<K extends string> = Partial<Record<K, string>>;

/**
 * Shows a field's error once the visitor has left that field or tried to submit, so nobody is told off while still
 * typing their first character. `check()` runs on submit: it reveals every error and moves focus to the first field
 * that needs fixing.
 *
 * @param errors The current error for each field, recomputed on every render.
 * @param ids The input id of each field, in the order they appear on screen.
 */
export function useClientValidation<K extends string>(errors: Errors<K>, ids: Record<K, string>) {
    const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});
    const [submitted, setSubmitted] = useState(false);

    const errorFor = (field: K) => (submitted || touched[field] ? errors[field] : undefined);
    const touch = (field: K) => setTouched((t) => ({ ...t, [field]: true }));

    const check = () => {
        setSubmitted(true);
        const first = (Object.keys(ids) as K[]).find((field) => errors[field]);
        if (first) document.getElementById(ids[first])?.focus();
        return !first;
    };

    return { errorFor, touch, check };
}
