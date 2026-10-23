import { useEffect, useEffectEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useShop } from '../../context/ShopContext';
import type { ViewType } from '../../types';

/**
 * Connects authentication events to page navigation. It renders nothing.
 *  - Arriving from a password-reset email opens the "choose a new password" page.
 *  - Arriving from another email link shows its outcome where the customer can act on it.
 *
 * Each effect re-runs only when its trigger value changes, so it navigates once per event and
 * customers are never bounced back and forth.
 */
export const AuthFlowCoordinator = () => {
  const { isPasswordRecovery, notice } = useAuth();
  const { navigateTo } = useShop();

  // Always calls the latest navigateTo without making it an effect trigger.
  const goTo = useEffectEvent((view: ViewType) => navigateTo(view));

  useEffect(() => {
    if (isPasswordRecovery) goTo('reset-password');
  }, [isPasswordRecovery]);

  useEffect(() => {
    if (notice?.origin !== 'email-link') return;
    goTo(notice.kind === 'error' ? 'login' : 'account');
  }, [notice]);

  return null;
};
