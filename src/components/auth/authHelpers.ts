import { useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import { isAccountView, type ViewType } from '../../types';

/** Where to send a customer after signing in: back to what they were browsing, or to their account. */
export function destinationAfterSignIn(returnView: ViewType): ViewType {
  return returnView === 'home' || isAccountView(returnView) ? 'account' : returnView;
}

export const firstNameOf = (name: string | null | undefined) => (name ?? '').trim().split(/\s+/)[0] || '';

/**
 * Runs a form submission at most once at a time. The ref changes immediately, so a second
 * submit fired before React re-renders (a fast double-click or double Enter) is ignored;
 * isSubmitting drives the disabled button and loading label.
 */
export function useSubmission() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inFlight = useRef(false);

  const run = async (task: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsSubmitting(true);
    try {
      await task();
    } finally {
      inFlight.current = false;
      setIsSubmitting(false);
    }
  };

  return { isSubmitting, run };
}

/**
 * Signs the customer out, confirms it, and leaves account pages. The shopping bag and wishlist
 * are stored separately on this device and are deliberately left untouched.
 */
export function useCustomerSignOut() {
  const { signOut } = useAuth();
  const { showToast, navigateTo, currentView } = useShop();

  return async () => {
    await signOut();
    showToast('You have been signed out.');
    if (isAccountView(currentView)) navigateTo('home');
  };
}
