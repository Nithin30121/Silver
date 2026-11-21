import { useSyncExternalStore } from 'react';

/** Phone-sized screens: the same breakpoint as the stylesheet's phone rules. */
export const PHONE_QUERY = '(max-width: 768px)';

const subscribeToPhone = (onChange: () => void) => {
  const query = window.matchMedia(PHONE_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

/** Whether the screen is phone-sized, kept up to date as it changes. */
export const useIsPhone = () => useSyncExternalStore(subscribeToPhone, () => window.matchMedia(PHONE_QUERY).matches, () => false);
