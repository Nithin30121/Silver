import { customerRequest } from './customerApi';

export type PaymentMethod = 'UPI' | 'CARD' | 'COD' | 'ONLINE';

export interface CheckoutRequest {
  items: Array<{ productId: string; quantity: number }>;
  paymentMethod: PaymentMethod;
  shippingFullName: string;
  shippingEmail: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: PaymentMethod;
  subtotal?: number | string;
  shippingAmount?: number | string;
  totalAmount: number | string;
  shippingFullName?: string;
  shippingEmail?: string;
  shippingPhone?: string;
  shippingAddress?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingPostalCode?: string;
  createdAt?: string;
  items?: Array<{ productId: string | null; productName: string; productSku: string | null; unitPrice: number | string; quantity: number; lineTotal: number | string }>;
  statusHistory?: Array<{ status: string; note: string; createdAt: string }>;
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  /** Whether the customer may still cancel the order themselves (decided by the server). */
  canCancel?: boolean;
  /** Whether the customer can pay for this order online, and until when (decided by the server). */
  canPay?: boolean;
  paymentDueAt?: string | null;
}

/** What Razorpay's payment window needs. The amount comes from the order the server saved. */
export interface StartedPayment {
  keyId: string;
  razorpayOrderId: string;
  amountInPaise: number;
  currency: string;
  shopName: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}

/** The proof Razorpay's window gives the browser. The server checks it before anything counts as paid. */
export interface PaymentProof {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

export interface OrderPage {
  content: OrderResponse[];
}

/** Sends only an access token and checkout intent; all prices and stock are revalidated by the API. */
export function createOrder(request: CheckoutRequest): Promise<OrderResponse> {
  return customerRequest<OrderResponse>('/orders', 'We could not create your order. Please try again.', { method: 'POST', body: request });
}

/** Loads only the signed-in customer's own orders, newest first. */
export async function loadOrderHistory(): Promise<OrderResponse[]> {
  const page = await customerRequest<OrderPage>('/orders?page=0&size=50&sort=createdAt,desc', 'We could not load your order history.');
  return page.content;
}

/** One of the signed-in customer's own orders; anyone else's order is reported as not found. */
export function loadOrder(id: string): Promise<OrderResponse> {
  return customerRequest<OrderResponse>(`/orders/${encodeURIComponent(id)}`, 'We could not load this order.');
}

/** Cancels the customer's own order if it has not shipped and is not paid yet. */
export function cancelOrder(id: string): Promise<OrderResponse> {
  return customerRequest<OrderResponse>(`/orders/${encodeURIComponent(id)}/cancel`, 'We could not cancel this order. Please try again.', { method: 'POST' });
}

/** Whether customers can pay online yet; the shop turns this on by adding its Razorpay keys to the server. */
export function loadPaymentOptions(): Promise<{ online: boolean }> {
  return customerRequest<{ online: boolean }>('/orders/payment-options', 'We could not load the payment options.');
}

export function startPayment(id: string): Promise<StartedPayment> {
  return customerRequest<StartedPayment>(`/orders/${encodeURIComponent(id)}/payment`, 'We could not start the payment. Please try again.', { method: 'POST' });
}

export function verifyPayment(id: string, proof: PaymentProof): Promise<OrderResponse> {
  return customerRequest<OrderResponse>(`/orders/${encodeURIComponent(id)}/payment/verify`, 'We could not confirm your payment.', { method: 'POST', body: proof });
}
