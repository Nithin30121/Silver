import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { initialAuthRedirect, isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import * as authService from '../services/authService';
import * as profileService from '../services/profileService';
import * as accountService from '../services/accountService';
import { AccountError, toAccountError, type SignUpInput, type SignUpOutcome } from '../services/authService';
import type { CustomerProfile } from '../types';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

/** A message for the customer about something that happened outside a form. */
export interface AuthNotice {
  kind: 'success' | 'error' | 'info';
  message: string;
  /** "email-link": the customer followed a link from one of our emails. "session": the session ended. */
  origin: 'email-link' | 'session';
}

interface AuthContextType {
  /** False when the Supabase environment variables are missing; the shop still works for guests. */
  isConfigured: boolean;
  status: AuthStatus;
  user: User | null;
  profile: CustomerProfile | null;
  isProfileLoading: boolean;
  profileError: string | null;
  /** The customer's name for greetings, falling back to their email address. */
  displayName: string | null;
  /** True after following a password-reset link, until a new password has been saved. */
  isPasswordRecovery: boolean;
  notice: AuthNotice | null;
  clearNotice: () => void;

  signUp: (input: SignUpInput) => Promise<SignUpOutcome>;
  signIn: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  resendConfirmationEmail: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  /** For a signed-in customer who knows their current password. Other devices are signed out. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Confirms the password, permanently deletes the account, then signs out on this device. */
  deleteAccount: (password: string) => Promise<void>;
  updateFullName: (fullName: string) => Promise<void>;
}

interface ProfileState {
  userId: string;
  profile: CustomerProfile | null;
  error: string | null;
}

const AUTH_URL_KEYS = [
  'type', 'error', 'error_code', 'error_description', 'sb',
  'access_token', 'refresh_token', 'expires_in', 'expires_at', 'token_type', 'provider_token', 'provider_refresh_token'
];

/** Removes email-link parameters (including any error details) from the address bar. */
function removeAuthParamsFromUrl() {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams(url.hash.slice(1));
  AUTH_URL_KEYS.forEach((key) => {
    url.searchParams.delete(key);
    hashParams.delete(key);
  });
  url.hash = hashParams.toString();
  window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
}

function describeLinkError(errorCode: string | null): string {
  return errorCode === 'otp_expired'
    ? 'This email link has expired or has already been used. Please request a new one if you still need it.'
    : 'This email link is invalid or has expired. Please request a new one if you still need it.';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'anonymous');
  const [profileState, setProfileState] = useState<ProfileState | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const [notice, setNotice] = useState<AuthNotice | null>(null);

  const initialRedirectHandled = useRef(false);
  const expectingSignOut = useRef(false);

  // One subscription for the whole app. Supabase replays any stored session as INITIAL_SESSION,
  // so no separate session request is needed on load. Unsubscribing in the cleanup also stops
  // React Strict Mode's development double-run from leaving two listeners behind.
  useEffect(() => {
    if (!supabase) return;

    const handleInitialRedirect = (initialSession: Session | null) => {
      const { type, errorCode, errorDescription } = initialAuthRedirect;
      if (errorCode || errorDescription) {
        setNotice({ kind: 'error', origin: 'email-link', message: describeLinkError(errorCode) });
      } else if (type === 'recovery' && initialSession) {
        setIsPasswordRecovery(true);
      } else if ((type === 'signup' || type === 'email') && initialSession) {
        setNotice({ kind: 'success', origin: 'email-link', message: 'Thank you, your email address is confirmed. Welcome to SILVORA.' });
      } else if (type === 'email_change' && initialSession) {
        setNotice({ kind: 'success', origin: 'email-link', message: 'Your new email address is confirmed.' });
      }
      if (type || errorCode || errorDescription) removeAuthParamsFromUrl();
    };

    const { data } = supabase.auth.onAuthStateChange((event, nextSession) => {
      // Only update React state here: Supabase advises against awaiting other Supabase calls in this callback.
      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'anonymous');

      if (event === 'INITIAL_SESSION' && !initialRedirectHandled.current) {
        initialRedirectHandled.current = true;
        handleInitialRedirect(nextSession);
      } else if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      } else if (event === 'SIGNED_OUT') {
        setIsPasswordRecovery(false);
        if (!expectingSignOut.current) {
          // Expired session, or signed out in another tab.
          setNotice({ kind: 'info', origin: 'session', message: 'You have been signed out. Please sign in again to continue.' });
        }
        expectingSignOut.current = false;
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  // Load the profile whenever a different customer signs in.
  const user = session?.user ?? null;
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    profileService
      .fetchProfile(userId)
      .then((profile) => {
        if (!cancelled) setProfileState({ userId, profile, error: null });
      })
      .catch((error: unknown) => {
        if (!cancelled) setProfileState({ userId, profile: null, error: toAccountError(error, 'Loading profile').message });
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Only ever expose the profile belonging to the customer who is signed in right now.
  const currentProfile = profileState && profileState.userId === userId ? profileState : null;
  const metadataName = typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : '';
  const displayName = currentProfile?.profile?.fullName || metadataName || user?.email || null;

  const signOut = async () => {
    expectingSignOut.current = true;
    try {
      await authService.signOut();
    } catch (error) {
      expectingSignOut.current = false;
      throw error;
    }
  };

  const updatePassword = async (newPassword: string) => {
    await authService.updatePassword(newPassword);
    setIsPasswordRecovery(false);
  };

  const signedInEmail = () => {
    if (!user?.email) throw new AccountError('session-expired', 'Your session has expired. Please sign in again.');
    return user.email;
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    await authService.changePassword(signedInEmail(), currentPassword, newPassword);
  };

  const deleteAccount = async (password: string) => {
    await authService.confirmPassword(signedInEmail(), password);
    await accountService.deleteAccount();
    // The sign-in no longer exists, so this only clears the session stored on this device.
    expectingSignOut.current = true;
    try {
      await authService.signOut();
    } catch {
      expectingSignOut.current = false;
    }
  };

  const updateFullName = async (fullName: string) => {
    if (!userId) throw new AccountError('session-expired', 'Your session has expired. Please sign in again.');
    const profile = await profileService.updateFullName(userId, fullName);
    setProfileState({ userId, profile, error: null });
  };

  return (
    <AuthContext.Provider
      value={{
        isConfigured: isSupabaseConfigured,
        status,
        user,
        profile: currentProfile?.profile ?? null,
        isProfileLoading: userId !== null && currentProfile === null,
        profileError: currentProfile?.error ?? null,
        displayName,
        isPasswordRecovery,
        notice,
        clearNotice: () => setNotice(null),
        signUp: authService.signUp,
        signIn: authService.signIn,
        signOut,
        resendConfirmationEmail: authService.resendConfirmationEmail,
        requestPasswordReset: authService.requestPasswordReset,
        updatePassword,
        changePassword,
        deleteAccount,
        updateFullName
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
