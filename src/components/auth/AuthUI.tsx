import React, { useState } from 'react';
import { Eye, EyeOff, CircleAlert, MailCheck, Info } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/AuthContext';
import type { ViewType } from '../../types';
import { destinationAfterSignIn } from './authHelpers';

interface AuthLayoutProps {
  eyebrow: string;
  title: React.ReactNode;
  intro?: React.ReactNode;
  footer?: React.ReactNode;
  wide?: boolean;
  children?: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ eyebrow, title, intro, footer, wide = false, children }) => {
  const { isConfigured } = useAuth();

  return (
    <section className="auth-page" aria-labelledby="auth-page-title">
      <div className={`auth-card${wide ? ' auth-card--wide' : ''}`}>
        <span className="eyebrow">{eyebrow}</span>
        <h1 id="auth-page-title" className="auth-title">
          {title}
        </h1>
        {intro && <p className="auth-intro">{intro}</p>}

        {!isConfigured && (
          <AuthAlert kind="info">
            Client accounts are being prepared and are not available just yet. You can continue browsing and shopping
            as a guest.
          </AuthAlert>
        )}

        {children}

        {footer && <div className="auth-footer">{footer}</div>}
      </div>
    </section>
  );
};

interface AuthAlertProps {
  kind: 'error' | 'success' | 'info';
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export const AuthAlert: React.FC<AuthAlertProps> = ({ kind, children, actions }) => {
  const Icon = kind === 'error' ? CircleAlert : kind === 'success' ? MailCheck : Info;
  return (
    <div className={`auth-alert auth-alert--${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      <Icon size={16} className="auth-alert-icon" aria-hidden="true" />
      <div className="auth-alert-body">
        <div>{children}</div>
        {actions && <div className="auth-alert-actions">{actions}</div>}
      </div>
    </div>
  );
};

interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  ref?: React.Ref<HTMLInputElement>;
}

const describedBy = (id: string, error?: string, hint?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

const FieldMessage: React.FC<{ id: string; error?: string; hint?: string }> = ({ id, error, hint }) => {
  if (error) {
    return (
      <p id={`${id}-error`} className="auth-field-error">
        {error}
      </p>
    );
  }
  if (hint) {
    return (
      <p id={`${id}-hint`} className="auth-hint">
        {hint}
      </p>
    );
  }
  return null;
};

export const TextField: React.FC<FieldProps> = ({ id, label, error, hint, ref, ...inputProps }) => (
  <div className="auth-field">
    <label htmlFor={id} className="auth-label">
      {label}
    </label>
    <input
      {...inputProps}
      id={id}
      ref={ref}
      className="auth-input"
      aria-invalid={error ? true : undefined}
      aria-describedby={describedBy(id, error, hint)}
    />
    <FieldMessage id={id} error={error} hint={hint} />
  </div>
);

/** A password input with a show/hide control. */
export const PasswordField: React.FC<Omit<FieldProps, 'type'>> = ({ id, label, error, hint, ref, ...inputProps }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="auth-field">
      <label htmlFor={id} className="auth-label">
        {label}
      </label>
      <div className="auth-password">
        <input
          {...inputProps}
          id={id}
          ref={ref}
          type={isVisible ? 'text' : 'password'}
          className="auth-input"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
        />
        <button
          type="button"
          className="auth-password-toggle"
          onClick={() => setIsVisible((visible) => !visible)}
          aria-label="Show password"
          aria-pressed={isVisible}
          aria-controls={id}
          title={isVisible ? 'Hide password' : 'Show password'}
        >
          {isVisible ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
        </button>
      </div>
      <FieldMessage id={id} error={error} hint={hint} />
    </div>
  );
};

interface SubmitButtonProps {
  isSubmitting: boolean;
  label: string;
  submittingLabel: string;
  disabled?: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({ isSubmitting, label, submittingLabel, disabled = false }) => (
  <button type="submit" className="btn-primary auth-submit" disabled={isSubmitting || disabled}>
    {isSubmitting && <span className="auth-spinner" aria-hidden="true" />}
    <span>{isSubmitting ? submittingLabel : label}</span>
  </button>
);

/** A text-style link to another account page. */
export const AuthLink: React.FC<{ to: ViewType; children: React.ReactNode }> = ({ to, children }) => {
  const { navigateTo } = useShop();
  return (
    <button type="button" className="auth-link" onClick={() => navigateTo(to)}>
      {children}
    </button>
  );
};

/** Shown on sign-in and sign-up pages to customers who are already signed in, instead of redirecting. */
export const AlreadySignedIn: React.FC = () => {
  const { displayName, notice } = useAuth();
  const { navigateTo, returnView } = useShop();
  const continueTo = destinationAfterSignIn(returnView) === 'account' ? 'collection' : returnView;

  return (
    <AuthLayout eyebrow="CLIENT ACCOUNT" title="You are signed in" intro={`Signed in as ${displayName ?? 'a SILVESTO LUXE client'}.`}>
      {/* e.g. an expired email link followed while already signed in */}
      {notice && <AuthAlert kind={notice.kind}>{notice.message}</AuthAlert>}
      <div className="auth-actions">
        <button type="button" className="btn-primary" onClick={() => navigateTo('account')}>
          View My Account
        </button>
        <button type="button" className="btn-secondary" onClick={() => navigateTo(continueTo)}>
          Continue Shopping
        </button>
      </div>
    </AuthLayout>
  );
};
