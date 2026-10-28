import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { useShop } from '../../context/ShopContext';
import {
  createAddress, deleteAddress, formatAddress, listAddresses, MAX_SAVED_ADDRESSES, updateAddress,
  type AddressInput, type SavedAddress
} from '../../services/accountService';
import { CustomerApiError } from '../../services/customerApi';
import { hasErrors, type FieldErrors } from '../../lib/authValidation';
import { cleanAddress, INDIAN_STATES, validateAddress, type AddressField } from '../../lib/addressValidation';
import { AuthAlert, SubmitButton, TextField } from './AuthUI';
import { useSubmission } from './authHelpers';

const EMPTY_ADDRESS: AddressInput = { fullName: '', phone: '', addressLine: '', city: '', state: '', postalCode: '', makeDefault: false };

const errorMessage = (error: unknown, fallback: string) => error instanceof Error ? error.message : fallback;

interface AddressFormProps {
  initial: AddressInput;
  /** Hidden for a customer's first address, which is always the default. */
  showDefaultOption: boolean;
  submitLabel: string;
  onSubmit: (input: AddressInput) => Promise<void>;
  onCancel: () => void;
}

const AddressForm: React.FC<AddressFormProps> = ({ initial, showDefaultOption, submitLabel, onSubmit, onCancel }) => {
  const [form, setForm] = useState<AddressInput>(initial);
  const [errors, setErrors] = useState<FieldErrors<AddressField>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const { isSubmitting, run } = useSubmission();
  const formRef = useRef<HTMLFormElement>(null);

  const field = (name: AddressField) => ({
    id: `address-${name}`,
    value: form[name],
    error: errors[name],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm({ ...form, [name]: e.target.value });
      setErrors((previous) => ({ ...previous, [name]: undefined }));
    },
  });

  const focusFirstError = (fieldErrors: FieldErrors<AddressField>) => {
    const first = (Object.keys(fieldErrors) as AddressField[]).find((name) => fieldErrors[name]);
    if (first) formRef.current?.querySelector<HTMLInputElement>(`#address-${first}`)?.focus();
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const nextErrors = validateAddress(form);
    setErrors(nextErrors);
    setFormError(null);
    if (hasErrors(nextErrors)) return focusFirstError(nextErrors);

    await run(async () => {
      try {
        await onSubmit(cleanAddress(form));
      } catch (error) {
        // The server names any field it rejected, using the same field names as this form.
        if (error instanceof CustomerApiError && Object.keys(error.fields).length > 0) {
          setErrors(error.fields as FieldErrors<AddressField>);
          focusFirstError(error.fields as FieldErrors<AddressField>);
        } else {
          setFormError(errorMessage(error, 'We could not save this address. Please try again.'));
        }
      }
    });
  };

  return (
    <form ref={formRef} className="auth-form account-address-form" onSubmit={handleSubmit} noValidate aria-busy={isSubmitting}>
      {formError && <AuthAlert kind="error">{formError}</AuthAlert>}
      <TextField {...field('fullName')} label="Recipient's full name" autoComplete="name" maxLength={120} />
      <TextField {...field('phone')} label="Phone number" type="tel" inputMode="tel" autoComplete="tel" maxLength={20}
        placeholder="+91 98765 43210" hint="For the courier, in case they need to reach the recipient." />
      <TextField {...field('addressLine')} label="Street address" autoComplete="street-address" maxLength={300}
        placeholder="Flat or house number, building, street, area" />
      <div className="account-form-row">
        <TextField {...field('city')} label="City" autoComplete="address-level2" maxLength={120} />
        <TextField {...field('postalCode')} label="PIN code" inputMode="numeric" autoComplete="postal-code" maxLength={7} placeholder="400001" />
      </div>
      <TextField {...field('state')} label="State" list="account-indian-states" autoComplete="address-level1" maxLength={120} />
      <datalist id="account-indian-states">{INDIAN_STATES.map((state) => <option key={state} value={state} />)}</datalist>
      {showDefaultOption && (
        <label className="account-checkbox">
          <input type="checkbox" checked={Boolean(form.makeDefault)} onChange={(e) => setForm({ ...form, makeDefault: e.target.checked })} />
          <span>Use this as my default delivery address</span>
        </label>
      )}
      <div className="account-name-actions">
        <SubmitButton isSubmitting={isSubmitting} label={submitLabel} submittingLabel="Saving…" />
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isSubmitting}>Cancel</button>
      </div>
    </form>
  );
};

/** The signed-in customer's saved delivery addresses, offered again at checkout. */
export const AddressBook: React.FC = () => {
  const { showToast } = useShop();
  const [addresses, setAddresses] = useState<SavedAddress[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<'new' | SavedAddress | null>(null);
  const [confirmingRemoval, setConfirmingRemoval] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const reload = async () => {
    try {
      setAddresses(await listAddresses());
      setLoadError(null);
    } catch (error) {
      setLoadError(errorMessage(error, 'We could not load your saved addresses.'));
    }
  };

  useEffect(() => {
    let cancelled = false;
    listAddresses()
      .then((list) => { if (!cancelled) setAddresses(list); })
      .catch((error: unknown) => { if (!cancelled) setLoadError(errorMessage(error, 'We could not load your saved addresses.')); });
    return () => { cancelled = true; };
  }, []);

  const save = async (input: AddressInput) => {
    if (editing === 'new') {
      await createAddress(input);
      showToast('Address saved.');
    } else if (editing) {
      await updateAddress(editing.id, input);
      showToast('Address updated.');
    }
    setEditing(null);
    await reload();
  };

  const runAction = async (address: SavedAddress, action: () => Promise<unknown>, done: string) => {
    setBusyId(address.id);
    setActionError(null);
    try {
      await action();
      showToast(done);
      setConfirmingRemoval(null);
      await reload();
    } catch (error) {
      setActionError(errorMessage(error, 'Something went wrong. Please try again.'));
    } finally {
      setBusyId(null);
    }
  };

  const inputOf = (address: SavedAddress, makeDefault: boolean): AddressInput => ({
    fullName: address.fullName, phone: address.phone, addressLine: address.addressLine,
    city: address.city, state: address.state, postalCode: address.postalCode, makeDefault,
  });

  if (loadError && !addresses) {
    return (
      <AuthAlert kind="error" actions={<button type="button" className="auth-link" onClick={() => void reload()}>Try again</button>}>
        {loadError}
      </AuthAlert>
    );
  }
  if (!addresses) return <p className="auth-loading"><span className="auth-spinner" aria-hidden="true" /> Loading your addresses…</p>;

  if (editing) {
    return (
      <>
        <h3 className="account-subtitle">{editing === 'new' ? 'Add a delivery address' : 'Edit address'}</h3>
        <AddressForm
          initial={editing === 'new' ? EMPTY_ADDRESS : inputOf(editing, editing.defaultAddress)}
          showDefaultOption={addresses.length > 0 && (editing === 'new' || !editing.defaultAddress)}
          submitLabel={editing === 'new' ? 'Save Address' : 'Save Changes'}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      </>
    );
  }

  const canAddMore = addresses.length < MAX_SAVED_ADDRESSES;
  return (
    <>
      {actionError && <AuthAlert kind="error">{actionError}</AuthAlert>}
      {addresses.length === 0 ? (
        <div className="account-empty">
          <MapPin size={22} aria-hidden="true" />
          <p>You haven't saved any addresses yet. Save one here, or tick "Save this address" at checkout, and it will be ready next time.</p>
        </div>
      ) : (
        <ul className="account-address-list">
          {addresses.map((address) => (
            <li key={address.id} className={`account-address${address.defaultAddress ? ' is-default' : ''}`}>
              <div className="account-address-text">
                <p className="account-address-name">
                  <strong>{address.fullName}</strong>
                  {address.defaultAddress && <span className="account-badge">Default</span>}
                </p>
                <p>{formatAddress(address)}</p>
                <p className="account-muted">{address.phone}</p>
              </div>
              {confirmingRemoval === address.id ? (
                <div className="account-inline-confirm" role="group" aria-label="Confirm removing this address">
                  <span>Remove this address?</span>
                  <button type="button" className="auth-link" disabled={busyId === address.id}
                    onClick={() => void runAction(address, () => deleteAddress(address.id), 'Address removed.')}>
                    {busyId === address.id ? 'Removing…' : 'Yes, remove'}
                  </button>
                  <button type="button" className="auth-link" disabled={busyId === address.id} onClick={() => setConfirmingRemoval(null)}>Keep it</button>
                </div>
              ) : (
                <div className="account-address-actions">
                  <button type="button" className="auth-link" disabled={busyId !== null} onClick={() => setEditing(address)}>Edit</button>
                  {!address.defaultAddress && (
                    <button type="button" className="auth-link" disabled={busyId !== null}
                      onClick={() => void runAction(address, () => updateAddress(address.id, inputOf(address, true)), 'Default address updated.')}>
                      {busyId === address.id ? 'Saving…' : 'Make default'}
                    </button>
                  )}
                  <button type="button" className="auth-link" disabled={busyId !== null} onClick={() => setConfirmingRemoval(address.id)}>Remove</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {canAddMore ? (
        <button type="button" className="btn-secondary account-add-button" onClick={() => { setActionError(null); setEditing('new'); }}>
          <Plus size={15} aria-hidden="true" />
          <span>Add a New Address</span>
        </button>
      ) : (
        <p className="account-note">You've saved the most addresses we can keep ({MAX_SAVED_ADDRESSES}). Remove one to add another.</p>
      )}
    </>
  );
};
