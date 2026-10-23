import React, { useRef, useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { toAccountError } from '../../services/authService';
import { MAX_NAME_LENGTH, validateFullName } from '../../lib/authValidation';
import { AuthAlert, AuthLayout, SubmitButton, TextField } from './AuthUI';
import { firstNameOf, useCustomerSignOut, useSubmission } from './authHelpers';

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));

const pieces = (count: number) => `${count} ${count === 1 ? 'piece' : 'pieces'}`;

/** Inline form for the one profile field customers may change. */
const NameEditor: React.FC<{ initialName: string; onDone: () => void }> = ({ initialName, onDone }) => {
  const { updateFullName } = useAuth();
  const { showToast } = useShop();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | undefined>();
  const { isSubmitting: isSaving, run } = useSubmission();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationError = validateFullName(name);
    setError(validationError);
    if (validationError) return inputRef.current?.focus();

    let saved = false;
    await run(async () => {
      try {
        await updateFullName(name);
        saved = true;
      } catch (err) {
        setError(toAccountError(err, 'Updating profile').message);
      }
    });
    if (saved) {
      showToast('Your name has been updated.');
      onDone();
    }
  };

  return (
    <form className="account-name-form" onSubmit={handleSubmit} noValidate aria-busy={isSaving}>
      <TextField
        id="account-full-name"
        ref={inputRef}
        label="Full name"
        autoComplete="name"
        maxLength={MAX_NAME_LENGTH}
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setError(undefined);
        }}
        error={error}
        autoFocus
      />
      <div className="account-name-actions">
        <SubmitButton isSubmitting={isSaving} label="Save" submittingLabel="Saving…" />
        <button type="button" className="btn-secondary" onClick={onDone} disabled={isSaving}>
          Cancel
        </button>
      </div>
    </form>
  );
};

/** Private account details. Only rendered for a signed-in customer; the database enforces the same rule. */
export const AccountPage: React.FC = () => {
  const { status, user, profile, isProfileLoading, profileError, displayName, notice, clearNotice } = useAuth();
  const { navigateTo, cartCount, wishlistCount } = useShop();
  const signOutCustomer = useCustomerSignOut();

  const [isEditingName, setIsEditingName] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);

  if (status === 'loading') {
    return (
      <AuthLayout eyebrow="CLIENT ACCOUNT" title="Your account">
        <p className="auth-loading">
          <span className="auth-spinner" aria-hidden="true" /> Loading your account…
        </p>
      </AuthLayout>
    );
  }

  if (status !== 'authenticated' || !user) {
    return (
      <AuthLayout
        eyebrow="CLIENT ACCOUNT"
        title={
          <>
            Your <em>account</em>
          </>
        }
        intro="Please sign in to view your account details."
      >
        {notice && <AuthAlert kind={notice.kind}>{notice.message}</AuthAlert>}
        <div className="auth-actions">
          <button type="button" className="btn-primary" onClick={() => navigateTo('login')}>
            Sign In
          </button>
          <button type="button" className="btn-secondary" onClick={() => navigateTo('signup')}>
            Create Account
          </button>
        </div>
      </AuthLayout>
    );
  }

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError(null);
    try {
      await signOutCustomer();
    } catch (error) {
      setSignOutError(toAccountError(error, 'Sign-out').message);
      setIsSigningOut(false);
    }
  };

  const fullName = profile?.fullName || displayName || '';

  return (
    <AuthLayout
      wide
      eyebrow="CLIENT ACCOUNT"
      title={
        <>
          Welcome, <em>{firstNameOf(fullName) || 'valued client'}</em>.
        </>
      }
      intro="Your private client details at SILVESTO LUXE."
    >
      {notice && (
        <AuthAlert
          kind={notice.kind}
          actions={
            <button type="button" className="auth-link" onClick={clearNotice}>
              Dismiss
            </button>
          }
        >
          {notice.message}
        </AuthAlert>
      )}
      {profileError && <AuthAlert kind="error">{profileError}</AuthAlert>}

      <h2 className="account-section-title">Profile</h2>
      <dl className="account-details" aria-busy={isProfileLoading}>
        <div className="account-detail">
          <dt>Full name</dt>
          <dd>
            {isEditingName ? (
              <NameEditor initialName={fullName} onDone={() => setIsEditingName(false)} />
            ) : (
              <>
                <span>{isProfileLoading ? 'Loading…' : fullName || 'Not provided'}</span>
                {profile && (
                  <button type="button" className="auth-link" onClick={() => setIsEditingName(true)}>
                    Edit
                  </button>
                )}
              </>
            )}
          </dd>
        </div>
        <div className="account-detail">
          <dt>Email</dt>
          <dd>
            <span>{user.email}</span>
            {user.email_confirmed_at ? (
              <span className="account-badge">Verified</span>
            ) : (
              <span className="account-badge account-badge--muted">Not yet verified</span>
            )}
          </dd>
        </div>
        <div className="account-detail">
          <dt>Client since</dt>
          <dd>
            <span>{formatDate(profile?.createdAt ?? user.created_at)}</span>
          </dd>
        </div>
      </dl>

      <h2 className="account-section-title">Your selections</h2>
      <p className="account-note">
        Your shopping bag ({pieces(cartCount)}) and saved pieces ({pieces(wishlistCount)}) are kept on this device.
        Signing out does not remove them.
      </p>

      {signOutError && <AuthAlert kind="error">{signOutError}</AuthAlert>}

      <div className="auth-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={() => navigateTo('collection', { category: 'all', gender: 'all' })}
        >
          Continue Shopping
        </button>
        <button type="button" className="btn-secondary" onClick={handleSignOut} disabled={isSigningOut}>
          <LogOut size={15} aria-hidden="true" />
          <span>{isSigningOut ? 'Signing Out…' : 'Sign Out'}</span>
        </button>
      </div>
    </AuthLayout>
  );
};
