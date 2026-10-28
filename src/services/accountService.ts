// SILVORA | Address book and account deletion
// Both live behind the shop's API, which scopes every request to the signed-in customer.

import { customerRequest } from './customerApi';

export interface SavedAddress {
  id: string;
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  defaultAddress: boolean;
}

export interface AddressInput {
  fullName: string;
  phone: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode: string;
  /** True makes this the address checkout picks first. A customer's first address is always the default. */
  makeDefault?: boolean;
}

/** The server accepts up to this many saved addresses per customer. */
export const MAX_SAVED_ADDRESSES = 10;

export function listAddresses(): Promise<SavedAddress[]> {
  return customerRequest<SavedAddress[]>('/me/addresses', 'We could not load your saved addresses.');
}

export function createAddress(input: AddressInput): Promise<SavedAddress> {
  return customerRequest<SavedAddress>('/me/addresses', 'We could not save this address.', { method: 'POST', body: input });
}

export function updateAddress(id: string, input: AddressInput): Promise<SavedAddress> {
  return customerRequest<SavedAddress>(`/me/addresses/${encodeURIComponent(id)}`, 'We could not update this address.', { method: 'PUT', body: input });
}

export function deleteAddress(id: string): Promise<void> {
  return customerRequest<void>(`/me/addresses/${encodeURIComponent(id)}`, 'We could not remove this address.', { method: 'DELETE' });
}

/**
 * Permanently deletes the signed-in customer's account. The server insists on a password entered
 * in the last few minutes, so call this straight after confirming the password.
 */
export function deleteAccount(): Promise<void> {
  return customerRequest<void>('/me', 'We could not delete your account. Please try again.', { method: 'DELETE' });
}

/** "Flat 2, MG Road, Pune, Maharashtra 411001" */
export const formatAddress = (address: Pick<SavedAddress, 'addressLine' | 'city' | 'state' | 'postalCode'>) =>
  [address.addressLine, address.city, [address.state, address.postalCode].filter(Boolean).join(' ')].filter(Boolean).join(', ');
