import React, { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { AccountError, toAccountError } from '../../services/authService';
import { validateEmail, type FieldErrors } from '../../lib/authValidation';
import { AlreadySignedIn, AuthAlert, AuthLayout, AuthLink, PasswordField, SubmitButton, TextField } from './AuthUI';
import { destinationAfterSignIn, firstNameOf, useSubmission } from './authHelpers';

type LoginField = 'email' | 'password';
type ResendState = 'idle' | 'sending' | 'sent';

export const LoginPage: React.FC = () => {
  const { status, isConfigured, signIn, resendConfirmationEmail, notice, clearNotice } = useAuth();
  const { navigateTo, returnView, showToast } = useShop();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors<LoginField>>({});
  const [formError, setFormError] = useState<AccountError | null>(null);
  const { isSubmitting, run } = useSubmission();
  const resend = useSubmission();
  const [resendState, setResendState] = useState<ResendState>('idle');
  const [resendError, setResendError] = useState<string | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  if (status === 'authenticated') return <AlreadySignedIn />;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const nextErrors: FieldErrors<LoginField> = {
      email: validateEmail(email),
      password: password ? undefined : 'Please enter your password.'
    };
    setErrors(nextErrors);
    setFormError(null);
    setResendState('idle');
    if (nextErrors.email) return emailRef.current?.focus();
    if (nextErrors.password) return passwordRef.current?.focus();

    await run(async () => {
      try {
        const user = await signIn(email, password);
        clearNotice();
        const firstName = firstNameOf(typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '');
        showToast(firstName ? `Welcome back, ${firstName}.` : 'Welcome back.');
        navigateTo(destinationAfterSignIn(returnView));
      } catch (error) {
        setFormError(toAccountError(error, 'Sign-in'));
        setPassword('');
      }
    });
  };

  const handleResend = () =>
    resend.run(async () => {
      setResendState('sending');
      setResendError(null);
      try {
        await resendConfirmationEmail(email);
        setResendState('sent');
      } catch (error) {
        setResendState('idle');
        setResendError(toAccountError(error, 'Resending confirmation').message);
      }
    });

  return (
    <AuthLayout
      eyebrow="CLIENT ACCOUNT"
      title={
        <>
          Welcome <em>back</em>
        </>
      }
      intro="Sign in to your SILVORA client account."
      footer={
        <>
          New to SILVORA? <AuthLink to="signup">Create an account</AuthLink>
        </>
      }
    >
      {notice && (
        <AuthAlert
          kind={notice.kind}
          actions={notice.origin === 'email-link' && notice.kind === 'error' ? <AuthLink to="forgot-password">Request a new password reset link</AuthLink> : undefined}
        >
          {notice.message}
        </AuthAlert>
      )}

      {formError && (
        <AuthAlert
          kind="error"
          actions={
            formError.kind === 'email-not-confirmed' ? (
              <button type="button" className="auth-link" onClick={handleResend} disabled={resendState === 'sending'}>
                {resendState === 'sending' ? 'Sending…' : 'Resend confirmation email'}
              </button>
            ) : undefined
          }
        >
          {formError.message}
        </AuthAlert>
      )}

      {resendState === 'sent' && (
        <AuthAlert kind="success">A new confirmation link is on its way to {email.trim()}.</AuthAlert>
      )}
      {resendError && <AuthAlert kind="error">{resendError}</AuthAlert>}

      <form className="auth-form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
        <TextField
          id="login-email"
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
            setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          error={errors.email}
          disabled={!isConfigured}
        />

        <PasswordField
          id="login-password"
          ref={passwordRef}
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors((prev) => ({ ...prev, password: undefined }));
          }}
          error={errors.password}
          disabled={!isConfigured}
        />

        <div className="auth-row">
          <AuthLink to="forgot-password">Forgotten your password?</AuthLink>
        </div>

        <SubmitButton isSubmitting={isSubmitting} label="Sign In" submittingLabel="Signing In…" disabled={!isConfigured} />
      </form>
    </AuthLayout>
  );
};
