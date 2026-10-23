// SILVORA | Account Form Validation
// Instant feedback for customers. Supabase enforces its own rules on the server as well, so these
// checks are for a better experience, not for security.

export const MIN_PASSWORD_LENGTH = 8;
/** Supabase Auth hashes passwords with bcrypt, which only accepts up to 72 bytes. */
export const MAX_PASSWORD_BYTES = 72;
export const MAX_NAME_LENGTH = 100;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FieldErrors<Field extends string> = Partial<Record<Field, string>>;

export function validateFullName(fullName: string): string | undefined {
  const name = fullName.trim();
  if (!name) return 'Please enter your full name.';
  if (name.length > MAX_NAME_LENGTH) return `Please keep your name under ${MAX_NAME_LENGTH} characters.`;
  return undefined;
}

export function validateEmail(email: string): string | undefined {
  const value = email.trim();
  if (!value) return 'Please enter your email address.';
  if (value.length > 254 || !EMAIL_PATTERN.test(value)) return 'Please enter a valid email address.';
  return undefined;
}

/** For choosing a new password (sign-up and password reset). */
export function validateNewPassword(password: string): string | undefined {
  if (!password) return 'Please choose a password.';
  if ([...password].length < MIN_PASSWORD_LENGTH) {
    return `Your password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (new TextEncoder().encode(password).length > MAX_PASSWORD_BYTES) {
    return `Your password must be at most ${MAX_PASSWORD_BYTES} characters (some symbols count as more than one).`;
  }
  return undefined;
}

export function validatePasswordConfirmation(password: string, confirmation: string): string | undefined {
  if (!confirmation) return 'Please confirm your password.';
  if (password !== confirmation) return 'The passwords do not match.';
  return undefined;
}

/** True when at least one field has an error. */
export function hasErrors<Field extends string>(errors: FieldErrors<Field>): boolean {
  return Object.values(errors).some(Boolean);
}
