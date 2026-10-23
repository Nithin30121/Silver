// SILVORA | Customer Profile Service
// Reads and updates rows in the "profiles" table. The database's Row Level Security rules are what
// actually protect this data: a customer can only ever read or change their own row, whatever
// this code asks for.

import type { PostgrestError } from '@supabase/supabase-js';
import type { CustomerProfile } from '../types';
import type { Database } from '../types/database';
import { AccountError, requireClient, toAccountError } from './authService';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

const PROFILE_COLUMNS = 'id, full_name, email, role, created_at, updated_at';

function toProfile(row: ProfileRow): CustomerProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role === 'admin' ? 'admin' : 'customer',
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toProfileError(error: PostgrestError, context: string): AccountError {
  if (import.meta.env.DEV) {
    console.warn(`[SILVORA] ${context} failed`, error);
  }
  switch (error.code) {
    case '42501': // insufficient privilege: blocked by database permissions
    case 'PGRST116': // no row visible to this customer
      return new AccountError('permission-denied', 'We could not access this profile. Please sign in again.');
    case 'PGRST301':
    case 'PGRST303': // expired or invalid access token
      return new AccountError('session-expired', 'Your session has expired. Please sign in again.');
    case '23514': // check constraint (e.g. name too long)
      return new AccountError('invalid-input', 'Please check the details you entered and try again.');
  }
  if (!error.code && /fetch|network/i.test(error.message)) {
    return new AccountError('network', 'We could not reach our secure client service. Please check your connection and try again.');
  }
  return new AccountError('unknown', 'We could not load your profile just now. Please try again in a moment.');
}

/** The signed-in customer's profile, or null if it does not exist (yet). */
export async function fetchProfile(userId: string): Promise<CustomerProfile | null> {
  const client = requireClient();
  try {
    const { data, error } = await client.from('profiles').select(PROFILE_COLUMNS).eq('id', userId).maybeSingle();
    if (error) throw toProfileError(error, 'Loading profile');
    return data ? toProfile(data) : null;
  } catch (error) {
    throw toAccountError(error, 'Loading profile');
  }
}

/** Customers may change only their name; the database rejects changes to any other column. */
export async function updateFullName(userId: string, fullName: string): Promise<CustomerProfile> {
  const client = requireClient();
  try {
    const { data, error } = await client
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', userId)
      .select(PROFILE_COLUMNS)
      .single();
    if (error) throw toProfileError(error, 'Updating profile');
    return toProfile(data);
  } catch (error) {
    throw toAccountError(error, 'Updating profile');
  }
}
