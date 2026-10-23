import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toAccountError } from '../../services/authService';
import { validateEmail } from '../../lib/authValidation';
import { AuthAlert, AuthLayout, AuthLink, SubmitButton, TextField } from './AuthUI';
import { useSubmission } from './authHelpers';

export const ForgotPasswordPage: React.FC = () => {
  const { isConfigured, requestPasswordReset } = useAuth();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const { isSubmitting, run } = useSubmission();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const error = validateEmail(email);
    setEmailError(error);
    setFormError(null);
    if (error) return emailRef.current?.focus();

    await run(async () => {
      try {
        await requestPasswordReset(email);
        setSentTo(email.trim());
      } catch (err) {
        setFormError(toAccountError(err, 'Password reset request').message);
      }
    });
  };

  if (sentTo) {
    return (
      <AuthLayout
        eyebrow="PASSWORD RESET"
        title={
          <>
            Check your <em>inbox</em>
          </>
        }
        footer={<AuthLink to="login">Back to sign in</AuthLink>}
      >
        {/* Deliberately neutral: never reveal whether an email address has an account. */}
        <AuthAlert kind="success">
          If an account exists for <strong>{sentTo}</strong>, we have sent it a link to choose a new password. The link
          can be used once and expires after a short time.
        </AuthAlert>
        <p className="auth-note">
          Nothing arrived? Check your spam folder, or{' '}
          <button type="button" className="auth-link" onClick={() => setSentTo(null)}>
            try another email address
          </button>
          .
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      eyebrow="PASSWORD RESET"
      title={
        <>
          Forgotten your <em>password?</em>
        </>
      }
      intro="Enter the email address of your account and we will send you a link to choose a new password."
      footer={
        <>
          Remembered it? <AuthLink to="login">Back to sign in</AuthLink>
        </>
      }
    >
      {formError && <AuthAlert kind="error">{formError}</AuthAlert>}

      <form className="auth-form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
        <TextField
          id="reset-email"
          ref={emailRef}
          label="Email address"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          spellCheck={false}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setEmailError(undefined);
          }}
          error={emailError}
          disabled={!isConfigured}
        />

        <SubmitButton isSubmitting={isSubmitting} label="Send Reset Link" submittingLabel="Sending…" disabled={!isConfigured} />
      </form>
    </AuthLayout>
  );
};
