import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { AuthUser } from '../types';
import {
  fetchCurrentUser,
  login as apiLogin,
  logout as apiLogout,
  signup as apiSignup,
  type LoginPayload,
  type SignupPayload
} from '../services/authService';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextType {
  user: AuthUser | null;
  status: AuthStatus;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  signup: (payload: SignupPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;

  // Account Drawer
  isAccountOpen: boolean;
  setIsAccountOpen: (open: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  // Bumped on every sign-in / sign-out, so a slower session check that started earlier
  // cannot overwrite the newer state when its response finally arrives.
  const sessionVersion = useRef(0);

  const applyUser = (next: AuthUser | null) => {
    setUser(next);
    setStatus(next ? 'authenticated' : 'anonymous');
  };

  // Ask the server who is signed in. If the backend is unreachable, the storefront keeps
  // working exactly as before for guests; only the account features are unavailable.
  const refreshUser = useCallback(async () => {
    const versionAtStart = sessionVersion.current;
    let current: AuthUser | null = null;
    try {
      current = await fetchCurrentUser();
    } catch {
      current = null;
    }
    if (sessionVersion.current === versionAtStart) {
      applyUser(current);
    }
  }, []);

  // Restore an existing session when the site loads.
  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = async (payload: LoginPayload) => {
    const signedIn = await apiLogin(payload);
    sessionVersion.current += 1;
    applyUser(signedIn);
    return signedIn;
  };

  const signup = async (payload: SignupPayload) => {
    const created = await apiSignup(payload);
    sessionVersion.current += 1;
    applyUser(created);
    return created;
  };

  const logout = async () => {
    await apiLogout();
    sessionVersion.current += 1;
    applyUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        status,
        login,
        signup,
        logout,
        refreshUser,
        isAccountOpen,
        setIsAccountOpen
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
