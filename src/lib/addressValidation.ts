// SILVORA | Delivery address checks
// Instant feedback that matches the server's own rules for saved addresses.

import type { FieldErrors } from './authValidation';
import type { AddressInput } from '../services/accountService';

export type AddressField = 'fullName' | 'phone' | 'addressLine' | 'city' | 'state' | 'postalCode';

/** Suggestions for the state box: India's states and union territories. */
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya',
  'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
];

const PHONE_PATTERN = /^\+?[0-9 ()-]{7,20}$/;
const PIN_PATTERN = /^[1-9][0-9]{5}$/;

/** "400 001" becomes "400001". */
export const normalisePin = (value: string) => value.replace(/\s+/g, '');

export const isValidPin = (value: string) => PIN_PATTERN.test(normalisePin(value));

export function validateAddress(input: AddressInput): FieldErrors<AddressField> {
  const required = (value: string, message: string, max: number) => {
    const text = value.trim();
    if (!text) return message;
    if (text.length > max) return `Please keep this under ${max} characters.`;
    return undefined;
  };
  return {
    fullName: required(input.fullName, "Please enter the recipient's name.", 120),
    phone: required(input.phone, 'Please enter a phone number.', 20)
      ?? (PHONE_PATTERN.test(input.phone.trim()) ? undefined : 'Please enter a valid phone number.'),
    addressLine: required(input.addressLine, 'Please enter the street address.', 300),
    city: required(input.city, 'Please enter the city.', 120),
    state: required(input.state, 'Please enter the state.', 120),
    postalCode: required(input.postalCode, 'Please enter the PIN code.', 12)
      ?? (isValidPin(input.postalCode) ? undefined : 'Please enter a 6-digit PIN code.'),
  };
}

/** Trimmed, with the PIN code's spaces removed, ready to send. */
export const cleanAddress = (input: AddressInput): AddressInput => ({
  fullName: input.fullName.trim(),
  phone: input.phone.trim(),
  addressLine: input.addressLine.trim(),
  city: input.city.trim(),
  state: input.state.trim(),
  postalCode: normalisePin(input.postalCode),
  makeDefault: input.makeDefault,
});
