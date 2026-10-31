// SILVORA | How order amounts, dates and states are written, shared by the shop and the dashboard.

/** ₹1,000 for whole rupees and ₹1,890.50 when there are paise, so printed totals add up exactly. */
export const money = (value: number | string) => {
  const amount = Number(value);
  const digits = Number.isInteger(Math.round(amount * 100) / 100) ? 0 : 2;
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount);
};

/** "PENDING_PAYMENT" becomes "Pending payment". */
export const humanize = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');

/** "28 Oct 2026" */
export const formatDate = (value?: string) => value
  ? new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value)) : '—';

export const PAYMENT_METHODS: Record<string, string> = { UPI: 'UPI', CARD: 'Card', COD: 'Cash on delivery', ONLINE: 'Online' };

/** "4:35 pm" */
export const formatTime = (value: string) =>
  new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value));

/** Courier links are shown as links only when they are secure web addresses (the server checks too). */
export const isSecureLink = (url?: string | null): url is string => Boolean(url && /^https:\/\/[^\s]+$/i.test(url));
