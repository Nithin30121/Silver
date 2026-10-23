import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { AccountError, toAccountError } from '../../services/authService';
import {
  MIN_PASSWORD_LENGTH,
  hasErrors,
  validateEmail,
  validateFullName,
  validateNewPassword,
  validatePasswordConfirmation,
  type FieldErrors
} from '../../lib/authValidation';
import { AlreadySignedIn, AuthAlert, AuthLayout, AuthLink, PasswordField, SubmitButton, TextField } from './AuthUI';
import { destinationAfterSignIn, firstNameOf, useSubmission } from './authHelpers';

type SignupField = 'fullName' | 'email' | 'password' | 'confirmPassword';

const EMPTY_FORM: Record<SignupField, string> = { fullName: '', email: '', password: '', confirmPassword: '' };
const FIELD_ORDER: SignupField[] = ['fullName', 'email', 'password', 'confirmPassword'];

export const SignupPage: React.FC = () => {
  const { status, isConfigured, signUp, resendConfirmationEmail } = useAuth();
  const { navigateTo, returnView, showToast } = useShop();

  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors<SignupField>>({});
  const [formError, setFormError] = useState<AccountError | null>(null);
  const { isSubmitting, run } = useSubmission();
  /** Set once the account is created but the email still needs confirming. */
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const resend = useSubmission();

  const fullNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  if (status === 'authenticated' && !pendingEmail) return <AlreadySignedIn />;

  const focusField = (field: SignupField) => {
    const refs = { fullName: fullNameRef, email: emailRef, password: passwordRef, confirmPassword: confirmPasswordRef };
    refs[field].current?.focus();
  };

  const updateField = (field: SignupField) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nextErrors: FieldErrors<SignupField> = {
      fullName: validateFullName(values.fullName),
      email: validateEmail(values.email),
      password: validateNewPassword(values.password),
      confirmPassword: validatePasswordConfirmation(values.password, values.confirmPassword)
    };
    setErrors(nextErrors);
    setFormError(null);
    if (hasErrors(nextErrors)) {
      const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field]);
      if (firstInvalid) focusField(firstInvalid);
      return;
    }

    await run(async () => {
      try {
        const outcome = await signUp({ fullName: values.fullName, email: values.email, password: values.password });
        if (outcome === 'confirmation-required') {
          setPendingEmail(values.email.trim());
          setValues(EMPTY_FORM);
        } else {
          const firstName = firstNameOf(values.fullName);
          showToast(`Welcome to SILVESTO LUXE, ${firstName}.`);
          navigateTo(destinationAfterSignIn(returnView));
        }
      } catch (error) {
        const accountError = toAccountError(error, 'Sign-up');
        if (accountError.kind === 'weak-password') {
          setErrors({ password: accountError.message });
          focusField('password');
        } else {
          setFormError(accountError);
        }
      }
    });
  };

  const handleResend = () =>
    resend.run(async () => {
      if (!pendingEmail) return;
      setResendMessage(null);
      try {
        await resendConfirmationEmail(pendingEmail);
        setResendMessage({ kind: 'success', text: `A new confirmation link is on its way to ${pendingEmail}.` });
      } catch (error) {
        setResendMessage({ kind: 'error', text: toAccountError(error, 'Resending confirmation').message });
      }
    });

  if (pendingEmail) {
    return (
      <AuthLayout
        eyebrow="ONE LAST STEP"
        title={
          <>
            Confirm your <em>email</em>
          </>
        }
        footer={
          <>
            Already confirmed? <AuthLink to="login">Sign in</AuthLink>
          </>
        }
      >
        <AuthAlert kind="success">
          We have sent a confirmation link to <strong>{pendingEmail}</strong>. Please open it to activate your account.
        </AuthAlert>
        <p className="auth-note">
          Can't find it? Check your spam or promotions folder, or{' '}
          <button type="button" className="auth-link" onClick={handleResend} disabled={resend.isSubmitting}>
            {resend.isSubmitting ? 'sending…' : 'send it again'}
          </button>
          .
        </p>
        {resendMessage && <AuthAlert kind={resendMessage.kind}>{resendMessage.text}</AuthAlert>}
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="CLIENT ACCOUNT"
      title={
        <>
          Create your <em>account</em>
        </>
      }
      intro="Join SILVESTO LUXE for a more personal way to discover fine sterling silver."
      footer={
        <>
          Already have an account? <AuthLink to="login">Sign in</AuthLink>
        </>
      }
    >
      {formError && (
        <AuthAlert
          kind="error"
          actions={
            formError.kind === 'account-exists' ? (
              <>
                <AuthLink to="login">Sign in</AuthLink>
                <AuthLink to="forgot-password">Reset password</AuthLink>
              </>
            ) : undefined
          }
        >
          {formError.message}
        </AuthAlert>
      )}

      <form className="auth-form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
        <TextField
          id="signup-full-name"
          ref={fullNameRef}
          label="Full name"
          autoComplete="name"
          maxLength={100}
          value={values.fullName}
          onChange={updateField('fullName')}
          error={errors.fullName}
          disabled={!isConfigured}
        />

        <TextField
          id="signup-email"
          ref={emailRef}
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={values.email}
          onChange={updateField('email')}
          error={errors.email}
          disabled={!isConfigured}
        />

        <PasswordField
          id="signup-password"
          ref={passwordRef}
          label="Password"
          autoComplete="new-password"
          value={values.password}
          onChange={updateField('password')}
          error={errors.password}
          hint={`At least ${MIN_PASSWORD_LENGTH} characters. A memorable phrase is both strong and easy to recall.`}
          disabled={!isConfigured}
        />

        <PasswordField
          id="signup-confirm-password"
          ref={confirmPasswordRef}
          label="Confirm password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={updateField('confirmPassword')}
          error={errors.confirmPassword}
          disabled={!isConfigured}
        />

        <SubmitButton
          isSubmitting={isSubmitting}
          label="Create Account"
          submittingLabel="Creating Your Account…"
          disabled={!isConfigured}
        />
      </form>
    </AuthLayout>
  );
};
