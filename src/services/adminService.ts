import { fetchWhileWaking } from '../lib/serverRetry';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';
import type { CatalogueCategory } from '../types';
import type { ApiProduct } from './catalogService';
import type { OrderResponse } from './orderService';

const configuredBaseUrl = import.meta.env.VITE_CATALOG_API_URL?.trim();
const API_BASE_URL = (configuredBaseUrl || 'http://localhost:8080/api').replace(/\/$/, '');

export interface AdminIdentity {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

export interface ProductInput {
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: number;
  imageUrl: string;
  weightGrams: number | null;
  stockQuantity: number;
  isActive: boolean;
  categoryIds: string[];
}

export interface CategoryInput {
  name: string;
  slug: string;
  parentId: string | null;
  categoryType: 'audience' | 'collection' | 'items';
  description: string;
  imageUrl: string;
  displayOrder: number;
  isActive: boolean;
}

export type CustomerRole = 'customer' | 'admin';

/** orderValue leaves out cancelled orders. It is not money received: the shop has no payment provider yet. */
export interface AdminCustomer {
  id: string;
  fullName: string;
  email: string | null;
  role: CustomerRole;
  joinedAt: string;
  orderCount: number;
  orderValue: number | string;
  lastOrderAt: string | null;
}

export interface CustomerPage {
  customers: AdminCustomer[];
  total: number;
  totalPages: number;
}

export interface AdminOrderPage {
  orders: OrderResponse[];
  total: number;
  totalPages: number;
}

/** Order value leaves out cancelled orders; "paid" only reflects what an admin has marked. */
export interface SalesPeriod {
  from: string | null;
  orderCount: number;
  orderValue: number | string;
  paidValue: number | string;
}

export interface SalesSummary {
  timeZone: string;
  thisWeek: SalesPeriod;
  thisMonth: SalesPeriod;
  allTime: SalesPeriod;
  ordersByStatus: Record<string, number>;
  bestSellers: Array<{ productId: string | null; name: string; sku: string | null; quantity: number; orderValue: number | string }>;
}

export type SalesInterval = 'DAY' | 'WEEK' | 'MONTH';

/** One bar of the sales chart: the day, week (its Monday) or month (its 1st) it starts on. */
export interface SalesPoint {
  start: string;
  orderCount: number;
  orderValue: number | string;
}

/** Leaves out cancelled orders. previous covers the same number of days just before from. */
export interface SalesSeries {
  timeZone: string;
  from: string;
  to: string;
  interval: SalesInterval;
  points: SalesPoint[];
  total: { orderCount: number; orderValue: number | string };
  previous: { orderCount: number; orderValue: number | string };
}

/** How often a piece was added to a wishlist: all time, and over the last 30 days. */
export interface WishlistCount {
  productId: string;
  allTime: number;
  recent: number;
}

export type StockReason = 'INITIAL' | 'MANUAL' | 'SALE' | 'CANCELLATION';

export interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  productSku: string | null;
  quantityChange: number;
  quantityAfter: number;
  reason: StockReason;
  orderId: string | null;
  orderNumber: string | null;
  actorName: string | null;
  createdAt: string;
}

export type MessageStatus = 'NEW' | 'DONE';

/** A message sent through the shop's contact form. fromAccount: the sender was signed in. */
export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  orderNumber: string | null;
  message: string;
  status: MessageStatus;
  fromAccount: boolean;
  createdAt: string;
  handledAt: string | null;
}

export interface MessagePage {
  messages: ContactMessage[];
  total: number;
  totalPages: number;
}

interface ApiPage<T> {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  page?: { totalElements?: number; totalPages?: number };
}

export class AdminApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

/** Shown when the server still can't be reached after waiting for it to wake. */
const UNREACHABLE = "The shop's server isn't answering. It may still be waking up; try again in a minute.";

export async function getAdminIdentity(): Promise<AdminIdentity> {
  const identity = await adminRequest<AdminIdentity>('/me');
  if (identity.role.toLowerCase() !== 'admin') {
    throw new AdminApiError('This account is not authorized to access the atelier dashboard.', 403);
  }
  return identity;
}

const PRODUCT_PAGE_SIZE = 100;
const MAX_PRODUCT_PAGES = 50;

/** Every product, a page at a time, so stock and low-stock figures cover the whole catalogue. */
export async function getAdminProducts(): Promise<{ products: ApiProduct[]; total: number }> {
  const products: ApiProduct[] = [];
  for (let page = 0; page < MAX_PRODUCT_PAGES; page += 1) {
    const search = new URLSearchParams({ page: String(page), size: String(PRODUCT_PAGE_SIZE), sort: 'name,asc' });
    const result = await adminRequest<ApiPage<ApiProduct>>(`/admin/products?${search}`);
    products.push(...result.content);
    const totalPages = result.totalPages ?? result.page?.totalPages ?? 1;
    if (page + 1 >= totalPages || result.content.length === 0) break;
  }
  return { products, total: products.length };
}

export const getAdminCategories = () => adminRequest<CatalogueCategory[]>('/admin/categories');
/** Newest first. The query matches part of an order number, customer name, email or phone. */
/** from and to are ISO days (2026-10-29), both included, counted in the shop's time zone. */
export async function getAdminOrders(options: { query?: string; status?: string; from?: string; to?: string; page?: number; size?: number } = {}): Promise<AdminOrderPage> {
  const search = new URLSearchParams({ page: String(options.page ?? 0), size: String(options.size ?? 25), sort: 'createdAt,desc' });
  if (options.query?.trim()) search.set('query', options.query.trim());
  if (options.status) search.set('status', options.status);
  if (options.from) search.set('from', options.from);
  if (options.to) search.set('to', options.to);
  const page = await adminRequest<ApiPage<OrderResponse>>(`/admin/orders?${search}`);
  return {
    orders: page.content,
    total: page.totalElements ?? page.page?.totalElements ?? page.content.length,
    totalPages: page.totalPages ?? page.page?.totalPages ?? 1
  };
}

export const getSalesSummary = () => adminRequest<SalesSummary>('/admin/reports/summary');

/** The silver rate shown in the storefront's rate bar; null when none is set. */
export interface SilverRateSettings {
  ratePerGram: number | string | null;
  rateSetAt: string | null;
}

export const getSilverRateSettings = () => adminRequest<SilverRateSettings>('/admin/settings/silver-rate');

/** ratePerGram is the new rate, or null to remove it and hide the rate bar. */
export const updateSilverRateSettings = (update: { ratePerGram: number | null }) =>
  adminRequest<SilverRateSettings>('/admin/settings/silver-rate', { method: 'PUT', body: JSON.stringify(update) });

/** Only pieces added at least once are listed. */
export const getWishlistCounts = () => adminRequest<WishlistCount[]>('/admin/wishlist-counts');

/** categoryId is null for pieces in no category. A piece in two categories counts in both. */
export interface CategorySales { categoryId: string | null; orderCount: number; pieces: number; orderValue: number | string }
export interface CategoryBreakdown { from: string; to: string; categories: CategorySales[]; total: { orderCount: number; orderValue: number | string } }

/** method is UPI, CARD or COD, as chosen at checkout; paidValue is what an admin has marked as paid. */
export interface PaymentMethodSales { method: string; orderCount: number; orderValue: number | string; paidValue: number | string }
export interface PaymentBreakdown { from: string; to: string; methods: PaymentMethodSales[] }

export interface CustomerGrowth {
  from: string;
  to: string;
  interval: SalesInterval;
  points: Array<{ start: string; newCustomers: number }>;
  total: number;
  previous: number;
  allCustomers: number;
}

const rangeQuery = (from: string, to: string, extra: Record<string, string> = {}) => new URLSearchParams({ from, to, ...extra });
export const getSalesByCategory = (from: string, to: string) =>
  adminRequest<CategoryBreakdown>(`/admin/reports/sales-by-category?${rangeQuery(from, to)}`);
export const getSalesByPaymentMethod = (from: string, to: string) =>
  adminRequest<PaymentBreakdown>(`/admin/reports/sales-by-payment-method?${rangeQuery(from, to)}`);
export const getCustomerGrowth = (from: string, to: string, interval: SalesInterval) =>
  adminRequest<CustomerGrowth>(`/admin/reports/customer-growth?${rangeQuery(from, to, { interval })}`);

/** Days are ISO dates in the shop's time zone, for example 2026-10-29; both ends are included. */
export const getSalesSeries = (from: string, to: string, interval: SalesInterval) =>
  adminRequest<SalesSeries>(`/admin/reports/sales?${new URLSearchParams({ from, to, interval })}`);
export const getEmailStatus = () => adminRequest<{ enabled: boolean }>('/admin/notifications/email');

/** Newest first; without a product id it lists changes across the whole catalogue. */
export async function getStockMovements(productId?: string, size = 20): Promise<{ movements: StockMovement[]; total: number }> {
  const path = productId ? `/admin/products/${productId}/stock-movements` : '/admin/stock-movements';
  const page = await adminRequest<ApiPage<StockMovement>>(`${path}?page=0&size=${size}`);
  return { movements: page.content, total: page.totalElements ?? page.page?.totalElements ?? page.content.length };
}

/** Downloads a server-made spreadsheet. The access token travels in a header, so a plain link can't be used. */
export async function downloadAdminCsv(kind: 'orders' | 'customers', filters: Record<string, string | undefined>, filename: string): Promise<void> {
  const search = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => { if (value?.trim()) search.set(key, value.trim()); });
  const token = await accessToken();
  let response: Response;
  try {
    response = await fetchWhileWaking(`${API_BASE_URL}/admin/reports/${kind}.csv?${search}`, {
      headers: { Accept: 'text/csv', Authorization: `Bearer ${token}` }
    });
  } catch {
    throw new AdminApiError(UNREACHABLE);
  }
  if (!response.ok) {
    throw new AdminApiError(response.status === 404 ? "Your server doesn't have downloads yet. Deploy the latest backend, then try again."
      : response.status === 401 ? 'Please sign in again.' : `The download failed (${response.status}).`, response.status);
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  // Revoked a moment later: some browsers cancel a download whose address disappears straight away.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function getAdminCustomers(options: { query?: string; role?: CustomerRole; page?: number; size?: number } = {}): Promise<CustomerPage> {
  const search = new URLSearchParams({ page: String(options.page ?? 0), size: String(options.size ?? 25) });
  if (options.query?.trim()) search.set('query', options.query.trim());
  if (options.role) search.set('role', options.role);
  const page = await adminRequest<ApiPage<AdminCustomer>>(`/admin/customers?${search}`);
  return {
    customers: page.content,
    total: page.totalElements ?? page.page?.totalElements ?? page.content.length,
    totalPages: page.totalPages ?? page.page?.totalPages ?? 1
  };
}

/** Newest first; without a status every message is listed. */
export async function getMessages(options: { status?: MessageStatus; page?: number; size?: number } = {}): Promise<MessagePage> {
  const search = new URLSearchParams({ page: String(options.page ?? 0), size: String(options.size ?? 25) });
  if (options.status) search.set('status', options.status);
  const page = await adminRequest<ApiPage<ContactMessage>>(`/admin/messages?${search}`);
  return {
    messages: page.content,
    total: page.totalElements ?? page.page?.totalElements ?? page.content.length,
    totalPages: page.totalPages ?? page.page?.totalPages ?? 1
  };
}

export function setMessageStatus(id: string, status: MessageStatus) {
  return adminRequest<ContactMessage>(`/admin/messages/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
}

export async function getCustomerOrders(customerId: string): Promise<{ orders: OrderResponse[]; total: number }> {
  const page = await adminRequest<ApiPage<OrderResponse>>(`/admin/customers/${customerId}/orders?page=0&size=50`);
  return { orders: page.content, total: page.totalElements ?? page.page?.totalElements ?? page.content.length };
}

/** notifyCustomer asks the server to email the customer about a status change, when email is set up there. */
export interface OrderTracking {
  carrier: string;
  number: string;
  url: string;
}

/** Without tracking the order keeps its saved courier details; blank tracking fields clear them. */
export function updateOrderStatus(id: string, status: string, paymentStatus: string, notifyCustomer = true, tracking?: OrderTracking) {
  return adminRequest<OrderResponse>(`/admin/orders/${id}/status`, {
    method: 'PATCH', body: JSON.stringify({
      status, paymentStatus, notifyCustomer,
      ...(tracking ? { trackingCarrier: tracking.carrier, trackingNumber: tracking.number, trackingUrl: tracking.url } : {})
    })
  });
}

export function createProduct(input: ProductInput) {
  return adminRequest<ApiProduct>('/admin/products', { method: 'POST', body: JSON.stringify(input) });
}

export function updateProduct(id: string, input: ProductInput) {
  return adminRequest<ApiProduct>(`/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function setProductActive(id: string, isActive: boolean) {
  return adminRequest<ApiProduct>(`/admin/products/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
}

export async function uploadProductImages(productId: string, files: File[]): Promise<void> {
  for (let index = 0; index < files.length; index += 1) {
    const form = new FormData();
    form.append('file', files[index]);
    form.append('displayOrder', String(index));
    await adminRequest(`/admin/products/${productId}/images`, { method: 'POST', body: form });
  }
}

export function createCategory(input: CategoryInput) {
  return adminRequest<CatalogueCategory>('/admin/categories', { method: 'POST', body: JSON.stringify(input) });
}

export function updateCategory(id: string, input: CategoryInput) {
  return adminRequest<CatalogueCategory>(`/admin/categories/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function setCategoryActive(id: string, isActive: boolean) {
  return adminRequest<CatalogueCategory>(`/admin/categories/${id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
}

/** Reads wait for a waking server (see lib/serverRetry); saves, uploads and status changes are sent once. */
async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetchWhileWaking(`${API_BASE_URL}${path}`, { ...init, headers });
  } catch {
    throw new AdminApiError(UNREACHABLE);
  }
  const body = await response.json().catch(() => null) as { message?: string } | T | null;
  if (!response.ok) {
    const message = body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
      ? body.message
      : response.status === 401 ? 'Please sign in again.'
        : response.status === 403 ? 'You do not have permission to manage the catalogue.'
          : `The dashboard request failed (${response.status}).`;
    throw new AdminApiError(message, response.status);
  }
  return body as T;
}

async function accessToken(): Promise<string> {
  if (!isSupabaseConfigured || !supabase) throw new AdminApiError('Customer accounts are not configured.', 401);
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new AdminApiError('Please sign in to access the dashboard.', 401);
  return data.session.access_token;
}
