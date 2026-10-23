import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { AccountError, toAccountError } from '../../services/authService';
import {
  MIN_PASSWORD_LENGTH,
  validateNewPassword,
  validatePasswordConfirmation,
  type FieldErrors
} from '../../lib/authValidation';
import { AuthAlert, AuthLayout, AuthLink, PasswordField, SubmitButton } from './AuthUI';
import { useSubmission } from './authHelpers';

type ResetField = 'password' | 'confirmPassword';

/** Reached from the link in a password-reset email (see AuthFlowCoordinator). */
export const ResetPasswordPage: React.FC = () => {
  const { status, isPasswordRecovery, updatePassword } = useAuth();
  const { navigateTo, showToast } = useShop();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<ResetField>>({});
  const [formError, setFormError] = useState<AccountError | null>(null);
  const { isSubmitting, run } = useSubmission();
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  if (status === 'loading') {
    return (
      <AuthLayout eyebrow="PASSWORD RESET" title="Verifying your link">
        <p className="auth-loading">
          <span className="auth-spinner" aria-hidden="true" /> One moment…
        </p>
      </AuthLayout>
    );
  }

  // Only a valid reset link puts the session into recovery mode; anything else gets a way forward instead.
  if (!isPasswordRecovery) {
    return (
      <AuthLayout
        eyebrow="PASSWORD RESET"
        title={
          <>
            Reset link <em>required</em>
          </>
        }
        intro="To choose a new password, please open the link in your password reset email. Links can be used once and expire after a short time."
        footer={<AuthLink to="login">Back to sign in</AuthLink>}
      >
        <div className="auth-actions">
          <button type="button" className="btn-primary" onClick={() => navigateTo('forgot-password')}>
            Request a New Link
          </button>
        </div>
      </AuthLayout>
    );
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nextErrors: FieldErrors<ResetField> = {
      password: validateNewPassword(password),
      confirmPassword: validatePasswordConfirmation(password, confirmPassword)
    };
    setErrors(nextErrors);
    setFormError(null);
    if (nextErrors.password) return passwordRef.current?.focus();
    if (nextErrors.confirmPassword) return confirmRef.current?.focus();

    await run(async () => {
      try {
        await updatePassword(password);
        showToast('Your password has been updated.');
        navigateTo('account');
      } catch (error) {
        const accountError = toAccountError(error, 'Password update');
        if (accountError.kind === 'weak-password' || accountError.kind === 'same-password') {
          setErrors({ password: accountError.message });
          passwordRef.current?.focus();
        } else {
          setFormError(accountError);
        }
      }
    });
  };

  return (
    <AuthLayout
      eyebrow="PASSWORD RESET"
      title={
        <>
          Choose a new <em>password</em>
        </>
      }
      intro="For your security, any other devices signed in to your account will be signed out once you save it."
    >
      {formError && (
        <AuthAlert
          kind="error"
          actions={formError.kind === 'session-expired' ? <AuthLink to="forgot-password">Request a new link</AuthLink> : undefined}
        >
          {formError.message}
        </AuthAlert>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
        <PasswordField
          id="new-password"
          ref={passwordRef}
          label="New password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors((prev) => ({ ...prev, password: undefined }));
          }}
          error={errors.password}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters.`}
        />

        <PasswordField
          id="confirm-new-password"
          ref={confirmRef}
          label="Confirm new password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            setErrors((prev) => ({ ...prev, confirmPassword: undefined }));
          }}
          error={errors.confirmPassword}
        />

        <SubmitButton isSubmitting={isSubmitting} label="Save New Password" submittingLabel="Saving…" />
      </form>
    </AuthLayout>
  );
};
