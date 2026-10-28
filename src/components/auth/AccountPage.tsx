import React, { useRef, useState } from 'react';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { toAccountError } from '../../services/authService';
import { MAX_NAME_LENGTH, validateFullName } from '../../lib/authValidation';
import { AuthAlert, AuthLayout, SubmitButton, TextField } from './AuthUI';
import { firstNameOf, useCustomerSignOut, useSubmission } from './authHelpers';
import { AccountOrders } from './AccountOrders';
import { AddressBook } from './AddressBook';
import { ChangePasswordForm, DeleteAccount } from './AccountSecurity';

type AccountTab = 'orders' | 'addresses' | 'profile';
const TABS: Array<{ id: AccountTab; label: string }> = [
  { id: 'orders', label: 'Orders' },
  { id: 'addresses', label: 'Addresses' },
  { id: 'profile', label: 'Profile' },
];

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
  const [tab, setTab] = useState<AccountTab>('orders');
  const tabRefs = useRef<Partial<Record<AccountTab, HTMLButtonElement | null>>>({});

  // Arrow keys move between tabs, as screen-reader users expect from a tab list.
  const handleTabKey = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = TABS[(index + step + TABS.length) % TABS.length].id;
    setTab(next);
    tabRefs.current[next]?.focus();
  };

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
      intro="Your private client details at SILVORA."
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

      <div className="account-tabs" role="tablist" aria-label="Your account">
        {TABS.map((item, index) => (
          <button
            key={item.id}
            ref={(element) => { tabRefs.current[item.id] = element; }}
            type="button"
            role="tab"
            id={`account-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`account-panel-${item.id}`}
            tabIndex={tab === item.id ? 0 : -1}
            className={`account-tab${tab === item.id ? ' is-active' : ''}`}
            onClick={() => setTab(item.id)}
            onKeyDown={(e) => handleTabKey(e, index)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="account-panel" role="tabpanel" id={`account-panel-${tab}`} aria-labelledby={`account-tab-${tab}`}>
        {tab === 'orders' && <AccountOrders />}
        {tab === 'addresses' && <AddressBook />}
        {tab === 'profile' && (
          <>
            <h2 className="account-section-title is-first">Profile</h2>
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

            <h2 className="account-section-title">Change password</h2>
            <ChangePasswordForm />

            <h2 className="account-section-title">Delete account</h2>
            <DeleteAccount />
          </>
        )}
      </div>

      {signOutError && <AuthAlert kind="error">{signOutError}</AuthAlert>}

      <div className="auth-actions">
        <button
          type="button"
          className="btn-primary"
          onClick={() => navigateTo('collection', { category: 'all', gender: 'all' })}
        >
          Continue Shopping
        </button>
        {profile?.role === 'admin' && (
          <a className="btn-secondary" href="/admin">
            <LayoutDashboard size={15} aria-hidden="true" />
            <span>Admin Dashboard</span>
          </a>
        )}
        <button type="button" className="btn-secondary" onClick={handleSignOut} disabled={isSigningOut}>
          <LogOut size={15} aria-hidden="true" />
          <span>{isSigningOut ? 'Signing Out…' : 'Sign Out'}</span>
        </button>
      </div>
    </AuthLayout>
  );
};
