// SILVORA | Opens Razorpay's payment window. Customers type their card or UPI details into Razorpay's own
// window, never into this site, and an order only counts as paid once the server has confirmed it.

import { startPayment, verifyPayment, type OrderResponse, type PaymentProof } from '../services/orderService';

const SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';
const CONFIRM_ATTEMPTS = 3;
const CONFIRM_RETRY_MS = 2000;
// Longer than this and a customer may still be in the window when the order's payment time runs out.
const WINDOW_TIMEOUT_SECONDS = 900;
const ACCENT_COLOR = '#9ec5e8';

interface RazorpayReply {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  timeout: number;
  handler: (reply: RazorpayReply) => void;
  modal: { ondismiss: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => { open: () => void };
  }
}

/** paid: confirmed. confirming: Razorpay took the payment but the server hasn't confirmed it yet. closed: not paid. */
export type PaymentOutcome = { kind: 'paid'; order: OrderResponse } | { kind: 'confirming' } | { kind: 'closed' };

let scriptLoad: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  scriptLoad ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoad = null;
      script.remove();
      reject(new Error('We could not open the payment window. Please check your connection and try again.'));
    };
    document.head.appendChild(script);
  });
  return scriptLoad;
}

/** Confirming twice is harmless, so a dropped connection here must not cost the customer their confirmation. */
async function confirmPayment(orderId: string, proof: PaymentProof): Promise<OrderResponse | null> {
  for (let attempt = 1; attempt <= CONFIRM_ATTEMPTS; attempt += 1) {
    try {
      return await verifyPayment(orderId, proof);
    } catch {
      if (attempt < CONFIRM_ATTEMPTS) await new Promise((resolve) => setTimeout(resolve, CONFIRM_RETRY_MS));
    }
  }
  return null;
}

/** Takes the customer through paying for their saved order. Throws if the payment can't be started. */
export async function payForOrder(orderId: string): Promise<PaymentOutcome> {
  const payment = await startPayment(orderId);
  await loadRazorpayScript();
  const reply = await new Promise<RazorpayReply | null>((resolve) => {
    if (!window.Razorpay) throw new Error('We could not open the payment window. Please try again.');
    new window.Razorpay({
      key: payment.keyId,
      amount: payment.amountInPaise,
      currency: payment.currency,
      name: payment.shopName,
      description: `Order ${payment.orderNumber}`,
      order_id: payment.razorpayOrderId,
      prefill: {
        name: payment.customerName,
        email: payment.customerEmail,
        contact: payment.customerPhone.replace(/[^\d+]/g, '')
      },
      theme: { color: ACCENT_COLOR },
      timeout: WINDOW_TIMEOUT_SECONDS,
      handler: resolve,
      modal: { ondismiss: () => resolve(null) }
    }).open();
  });
  if (!reply) return { kind: 'closed' };

  const order = await confirmPayment(orderId, {
    razorpayOrderId: reply.razorpay_order_id,
    razorpayPaymentId: reply.razorpay_payment_id,
    razorpaySignature: reply.razorpay_signature
  });
  return order?.paymentStatus === 'PAID' ? { kind: 'paid', order } : { kind: 'confirming' };
}
