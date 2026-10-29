import { customerRequest } from './customerApi';

export type PaymentMethod = 'UPI' | 'CARD' | 'COD';

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
