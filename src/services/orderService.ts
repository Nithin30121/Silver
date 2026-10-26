import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

const configuredBaseUrl = import.meta.env.VITE_CATALOG_API_URL?.trim();
const API_BASE_URL = (configuredBaseUrl || 'http://localhost:8080/api').replace(/\/$/, '');

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
  totalAmount: number | string;
}

export interface OrderPage {
  content: OrderResponse[];
}

export class OrderError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'OrderError';
    this.status = status;
  }
}

/** Sends only an access token and checkout intent; all prices and stock are revalidated by the API. */
export async function createOrder(request: CheckoutRequest): Promise<OrderResponse> {
  const accessToken = await customerAccessToken();

  const response = await fetch(`${API_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(request),
  });

  const body = await response.json().catch(() => null) as { message?: string } | OrderResponse | null;
  if (!response.ok) {
    const message = body && 'message' in body && typeof body.message === 'string'
      ? body.message
      : `We could not create your order (${response.status}).`;
    throw new OrderError(message, response.status);
  }

  return body as OrderResponse;
}

/** Loads only the signed-in customer's own order summaries. */
export async function loadOrderHistory(): Promise<OrderResponse[]> {
  const accessToken = await customerAccessToken();
  const response = await fetch(`${API_BASE_URL}/orders?page=0&size=20&sort=createdAt,desc`, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new OrderError(`We could not load your order history (${response.status}).`, response.status);
  const body = await response.json() as OrderPage;
  return body.content;
}

async function customerAccessToken(): Promise<string> {
  if (!isSupabaseConfigured || !supabase) {
    throw new OrderError('Sign in is unavailable while customer accounts are being configured.');
  }
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new OrderError('Please sign in before placing an order.', 401);
  }
  return data.session.access_token;
}
