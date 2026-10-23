// SILVORA | Supabase Client
// The single place where the Supabase client is created. Only the project URL and the
// publishable (public) key belong in the browser. Secret and service-role keys bypass all
// database security rules and must never appear in frontend code or VITE_ variables.

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL ?? '').trim();
const supabaseKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  ''
).trim();

/** Refuses keys that would grant full database access if shipped to browsers. */
function isPrivilegedKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true;
  // Legacy keys are JWTs; the service-role key carries "role": "service_role".
  const payload = key.split('.')[1];
  if (!payload) return false;
  try {
    const claims = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    return claims?.role === 'service_role';
  } catch {
    return false;
  }
}

function findConfigurationProblem(): string | null {
  if (!supabaseUrl || !supabaseKey) {
    return 'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are not set.';
  }
  try {
    new URL(supabaseUrl);
  } catch {
    return 'VITE_SUPABASE_URL is not a valid URL.';
  }
  if (isPrivilegedKey(supabaseKey)) {
    return 'A secret/service-role key was supplied. Use the publishable (or legacy anon) key instead.';
  }
  return null;
}

const configurationProblem = findConfigurationProblem();
if (configurationProblem) {
  console.error(`[SILVORA] Customer accounts are disabled: ${configurationProblem} See .env.example.`);
}

/** What an email link (sign-up confirmation, password reset) put in the URL. */
export interface AuthRedirect {
  type: string | null;
  errorCode: string | null;
  errorDescription: string | null;
}

function readAuthRedirect(): AuthRedirect {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const query = new URLSearchParams(window.location.search);
  const read = (key: string) => hash.get(key) ?? query.get(key);
  return {
    type: read('type'),
    errorCode: read('error_code') ?? read('error'),
    errorDescription: read('error_description')
  };
}

/**
 * Captured before the client below reads and clears the URL, so the app can still tell that the
 * visitor arrived from a password-reset link even if Supabase announces it before React listens.
 */
export const initialAuthRedirect: AuthRedirect = readAuthRedirect();

export const supabase = configurationProblem
  ? null
  : createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // "implicit" so links in confirmation and password-reset emails also work when opened on a
        // different device or browser. The stricter "pkce" flow only works in the browser that asked.
        flowType: 'implicit'
      }
    });

export const isSupabaseConfigured = supabase !== null;

/** Where Supabase sends customers back to from email links. Must be allow-listed in the dashboard. */
export const authRedirectUrl = () => `${window.location.origin}/`;
