import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { AccountError, toAccountError } from '../../services/authService';
import {
  MIN_PASSWORD_LENGTH, validateNewPassword, validatePasswordConfirmation, type FieldErrors
} from '../../lib/authValidation';
import { AuthAlert, PasswordField, SubmitButton } from './AuthUI';
import { useSubmission } from './authHelpers';

type PasswordFieldName = 'currentPassword' | 'newPassword' | 'confirmPassword';

/** Change password for a customer who knows their current one; the reset email is for those who don't. */
export const ChangePasswordForm: React.FC = () => {
  const { changePassword } = useAuth();
  const { showToast } = useShop();
  const [values, setValues] = useState<Record<PasswordFieldName, string>>({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [errors, setErrors] = useState<FieldErrors<PasswordFieldName>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const { isSubmitting, run } = useSubmission();
  const currentRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);
  const focus = (name: PasswordFieldName) =>
    (name === 'currentPassword' ? currentRef : name === 'newPassword' ? newRef : confirmRef).current?.focus();

  const update = (name: PasswordFieldName) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues({ ...values, [name]: e.target.value });
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  };

  const showFieldError = (name: PasswordFieldName, message: string) => {
    setErrors({ [name]: message });
    focus(name);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors: FieldErrors<PasswordFieldName> = {
      currentPassword: values.currentPassword ? undefined : 'Please enter your current password.',
      newPassword: validateNewPassword(values.newPassword),
      confirmPassword: validatePasswordConfirmation(values.newPassword, values.confirmPassword),
    };
    setErrors(nextErrors);
    setFormError(null);
    const firstError = (['currentPassword', 'newPassword', 'confirmPassword'] as const).find((name) => nextErrors[name]);
    if (firstError) return focus(firstError);

    await run(async () => {
      try {
        await changePassword(values.currentPassword, values.newPassword);
        setValues({ currentPassword: '', newPassword: '', confirmPassword: '' });
        showToast('Your password has been changed.');
      } catch (error) {
        const accountError = toAccountError(error, 'Password change');
        if (accountError.kind === 'invalid-credentials') showFieldError('currentPassword', accountError.message);
        else if (accountError.kind === 'weak-password' || accountError.kind === 'same-password') showFieldError('newPassword', accountError.message);
        else setFormError(accountError.message);
      }
    });
  };

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
      {formError && <AuthAlert kind="error">{formError}</AuthAlert>}
      <PasswordField id="current-password" ref={currentRef} label="Current password" autoComplete="current-password"
        value={values.currentPassword} onChange={update('currentPassword')} error={errors.currentPassword} />
      <PasswordField id="change-new-password" ref={newRef} label="New password" autoComplete="new-password"
        value={values.newPassword} onChange={update('newPassword')} error={errors.newPassword}
        hint={`At least ${MIN_PASSWORD_LENGTH} characters. Other devices signed in to your account will be signed out.`} />
      <PasswordField id="change-confirm-password" ref={confirmRef} label="Confirm new password" autoComplete="new-password"
        value={values.confirmPassword} onChange={update('confirmPassword')} error={errors.confirmPassword} />
      <SubmitButton isSubmitting={isSubmitting} label="Change Password" submittingLabel="Changing…" />
    </form>
  );
};

/** Permanent account deletion, behind a password check. Admin accounts are kept. */
export const DeleteAccount: React.FC = () => {
  const { profile, deleteAccount } = useAuth();
  const { navigateTo, showToast } = useShop();
  const [isConfirming, setIsConfirming] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const { isSubmitting, run } = useSubmission();
  const passwordRef = useRef<HTMLInputElement>(null);

  if (profile?.role === 'admin') {
    return <p className="account-note">This is an admin account, so it can't be deleted from the shop.</p>;
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    if (!password) {
      setPasswordError('Please enter your password to confirm.');
      return passwordRef.current?.focus();
    }
    await run(async () => {
      try {
        await deleteAccount(password);
        showToast('Your account has been deleted.');
        navigateTo('home');
      } catch (error) {
        if (error instanceof AccountError && error.kind === 'invalid-credentials') {
          setPasswordError(error.message);
          passwordRef.current?.focus();
        } else {
          setFormError(error instanceof Error ? error.message : 'We could not delete your account. Please try again.');
        }
      }
    });
  };

  return (
    <>
      <p className="account-note">
        Deleting your account removes your profile, saved addresses and sign-in for good. Orders you have already
        placed are kept for our records and tax purposes, no longer linked to an account. You can't delete your
        account while an order is still on its way.
      </p>
      {!isConfirming ? (
        <button type="button" className="btn-secondary account-danger-outline" onClick={() => setIsConfirming(true)}>
          Delete My Account
        </button>
      ) : (
        <form className="auth-form account-confirm" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
          {formError && <AuthAlert kind="error">{formError}</AuthAlert>}
          <PasswordField id="delete-account-password" ref={passwordRef} label="Enter your password to confirm"
            autoComplete="current-password" value={password} autoFocus error={passwordError}
            onChange={(e) => { setPassword(e.target.value); setPasswordError(undefined); }} />
          <div className="account-name-actions">
            <button type="submit" className="btn-primary account-danger-button" disabled={isSubmitting}>
              {isSubmitting && <span className="auth-spinner" aria-hidden="true" />}
              <span>{isSubmitting ? 'Deleting…' : 'Permanently Delete Account'}</span>
            </button>
            <button type="button" className="btn-secondary" disabled={isSubmitting}
              onClick={() => { setIsConfirming(false); setPassword(''); setPasswordError(undefined); setFormError(null); }}>
              Keep My Account
            </button>
          </div>
        </form>
      )}
    </>
  );
};
