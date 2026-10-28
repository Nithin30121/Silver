// SILVORA | Signed-in customer requests to the shop's API
// Every request carries the customer's short-lived Supabase access token. The API checks it and
// only ever shows or changes the token owner's own orders, addresses and account.

import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

const configuredBaseUrl = import.meta.env.VITE_CATALOG_API_URL?.trim();
export const API_BASE_URL = (configuredBaseUrl || 'http://localhost:8080/api').replace(/\/$/, '');

/** An error whose message is written for customers; fields maps form fields to their problem. */
export class CustomerApiError extends Error {
  readonly status?: number;
  readonly fields: Record<string, string>;

  constructor(message: string, status?: number, fields: Record<string, string> = {}) {
    super(message);
    this.name = 'CustomerApiError';
    this.status = status;
    this.fields = fields;
  }
}

export async function customerAccessToken(): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new CustomerApiError('Sign in is unavailable while customer accounts are being configured.');
  }
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new CustomerApiError('Please sign in to continue.', 401);
  }
  return data.session.access_token;
}

interface ErrorBody {
  message?: unknown;
  fields?: unknown;
}

/** The current access token, or null for a visitor who isn't signed in. */
async function optionalAccessToken(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Sends one request as the signed-in customer. The API's own message is shown when it has one
 * (it never contains internal details); otherwise `fallback` is. With signIn "optional" a visitor
 * may send it too, and a signed-in customer's token still goes along.
 */
export async function customerRequest<T>(path: string, fallback: string,
  init: { method?: string; body?: unknown; signIn?: 'required' | 'optional' } = {}): Promise<T> {
  const accessToken = init.signIn === 'optional' ? await optionalAccessToken() : await customerAccessToken();
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: init.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...(init.body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
  } catch {
    throw new CustomerApiError('We could not reach the shop just now. Please check your connection and try again.');
  }

  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => null) as ErrorBody | T | null;
  if (!response.ok) {
    if (response.status === 401) throw new CustomerApiError('Your session has expired. Please sign in again.', 401);
    const error = (body ?? {}) as ErrorBody;
    const message = typeof error.message === 'string' ? error.message : fallback;
    const fields = error.fields && typeof error.fields === 'object' ? error.fields as Record<string, string> : {};
    throw new CustomerApiError(message, response.status, fields);
  }
  return body as T;
}
