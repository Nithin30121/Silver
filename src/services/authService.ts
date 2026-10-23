// SILVESTO LUXE | Customer Authentication Service
// All Supabase Auth calls live here. Supabase stores and verifies passwords (hashed with bcrypt);
// this app never stores a password anywhere. Errors are translated into messages that are safe
// to show customers: raw server errors, tokens and internals are never displayed.

import {
  isAuthApiError,
  isAuthError,
  isAuthRetryableFetchError,
  isAuthSessionMissingError,
  isAuthWeakPasswordError,
  type User
} from '@supabase/supabase-js';
import { authRedirectUrl, supabase } from '../lib/supabaseClient';
import { MIN_PASSWORD_LENGTH } from '../lib/authValidation';

export type AccountErrorKind =
  | 'not-configured'
  | 'invalid-credentials'
  | 'email-not-confirmed'
  | 'account-exists'
  | 'weak-password'
  | 'same-password'
  | 'rate-limited'
  | 'session-expired'
  | 'permission-denied'
  | 'invalid-input'
  | 'network'
  | 'unknown';

/** An error whose message is written for customers. */
export class AccountError extends Error {
  readonly kind: AccountErrorKind;

  constructor(kind: AccountErrorKind, message: string) {
    super(message);
    this.name = 'AccountError';
    this.kind = kind;
  }
}

const GENERIC_MESSAGE = 'Something went wrong on our side. Please try again in a moment.';
const NETWORK_MESSAGE = 'We could not reach our secure client service. Please check your connection and try again.';

export function toAccountError(error: unknown, context: string): AccountError {
  if (error instanceof AccountError) return error;
  if (import.meta.env.DEV) {
    // Development only: technical details help debugging and contain no secrets.
    console.warn(`[SILVESTO LUXE] ${context} failed`, error);
  }

  if (isAuthRetryableFetchError(error) || error instanceof TypeError) {
    return new AccountError('network', NETWORK_MESSAGE);
  }
  if (isAuthWeakPasswordError(error)) {
    if (error.reasons.includes('pwned')) {
      return new AccountError('weak-password', 'This password has appeared in a known data breach. Please choose a different one.');
    }
    return new AccountError('weak-password', `Please choose a stronger password of at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
  if (isAuthSessionMissingError(error)) {
    return new AccountError('session-expired', 'Your session has expired. Please sign in again.');
  }
  if (isAuthApiError(error) || isAuthError(error)) {
    switch (error.code) {
      case 'invalid_credentials':
        return new AccountError('invalid-credentials', 'The email or password you entered is incorrect.');
      case 'email_not_confirmed':
        return new AccountError('email-not-confirmed', 'Please confirm your email address before signing in. The confirmation link is in your inbox.');
      case 'user_already_exists':
      case 'email_exists':
        return accountExistsError();
      case 'same_password':
        return new AccountError('same-password', 'Your new password must be different from your current password.');
      case 'over_email_send_rate_limit':
        return new AccountError('rate-limited', 'Too many emails have been requested. Please wait a few minutes and try again.');
      case 'over_request_rate_limit':
        return new AccountError('rate-limited', 'Too many attempts. Please wait a moment and try again.');
      case 'email_address_invalid':
        return new AccountError('invalid-input', 'Please enter a valid email address.');
      case 'signup_disabled':
      case 'email_provider_disabled':
        return new AccountError('not-configured', 'New account registration is currently unavailable.');
      case 'session_not_found':
      case 'session_expired':
      case 'refresh_token_not_found':
      case 'refresh_token_already_used':
      case 'bad_jwt':
        return new AccountError('session-expired', 'Your session has expired. Please sign in again.');
      case 'validation_failed':
        return new AccountError('invalid-input', 'Please check the details you entered and try again.');
    }
  }
  return new AccountError('unknown', GENERIC_MESSAGE);
}

function accountExistsError(): AccountError {
  return new AccountError('account-exists', 'An account with this email address already exists. Please sign in, or reset your password if you have forgotten it.');
}

export function requireClient() {
  if (!supabase) {
    throw new AccountError('not-configured', 'Client accounts are temporarily unavailable. Please try again later.');
  }
  return supabase;
}

export interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
}

/** "signed-in" when email confirmation is off; otherwise the customer must click the emailed link first. */
export type SignUpOutcome = 'signed-in' | 'confirmation-required';

export async function signUp({ fullName, email, password }: SignUpInput): Promise<SignUpOutcome> {
  const client = requireClient();
  try {
    const { data, error } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Saved as user metadata; the database trigger copies it into the customer's profile.
        data: { full_name: fullName.trim() },
        emailRedirectTo: authRedirectUrl()
      }
    });
    if (error) throw error;
    // With email confirmation on, Supabase hides whether an email is registered by returning a
    // user with no identities instead of an error.
    if (data.user && data.user.identities?.length === 0) throw accountExistsError();
    return data.session ? 'signed-in' : 'confirmation-required';
  } catch (error) {
    throw toAccountError(error, 'Sign-up');
  }
}

export async function signIn(email: string, password: string): Promise<User> {
  const client = requireClient();
  try {
    const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    return data.user;
  } catch (error) {
    throw toAccountError(error, 'Sign-in');
  }
}

/** Signs out this browser only; the customer's sessions on other devices are unaffected. */
export async function signOut(): Promise<void> {
  const client = requireClient();
  try {
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) throw error;
  } catch (error) {
    throw toAccountError(error, 'Sign-out');
  }
}

export async function resendConfirmationEmail(email: string): Promise<void> {
  const client = requireClient();
  try {
    const { error } = await client.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: authRedirectUrl() }
    });
    if (error) throw error;
  } catch (error) {
    throw toAccountError(error, 'Resending confirmation');
  }
}

/**
 * Emails a password-reset link. Supabase responds the same way whether or not the email is
 * registered, so the confirmation shown to customers never reveals who has an account.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const client = requireClient();
  try {
    const { error } = await client.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirectUrl() });
    if (error) throw error;
  } catch (error) {
    throw toAccountError(error, 'Password reset request');
  }
}

/** Sets a new password for the signed-in customer (used after following a reset link). */
export async function updatePassword(newPassword: string): Promise<void> {
  const client = requireClient();
  try {
    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
  } catch (error) {
    throw toAccountError(error, 'Password update');
  }
  // After a reset, end sessions elsewhere in case someone else knew the old password.
  // Best effort: the password is already changed even if this call fails.
  const { error } = await client.auth.signOut({ scope: 'others' });
  if (error && import.meta.env.DEV) console.warn('[SILVESTO LUXE] Could not end other sessions', error);
}
