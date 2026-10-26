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

export async function getAdminIdentity(): Promise<AdminIdentity> {
  const identity = await adminRequest<AdminIdentity>('/me');
  if (identity.role.toLowerCase() !== 'admin') {
    throw new AdminApiError('This account is not authorized to access the atelier dashboard.', 403);
  }
  return identity;
}

export async function getAdminProducts(query = ''): Promise<{ products: ApiProduct[]; total: number }> {
  const search = new URLSearchParams({ page: '0', size: '100', sort: 'name,asc' });
  if (query.trim()) search.set('query', query.trim());
  const page = await adminRequest<ApiPage<ApiProduct>>(`/admin/products?${search}`);
  return { products: page.content, total: page.totalElements ?? page.page?.totalElements ?? page.content.length };
}

export const getAdminCategories = () => adminRequest<CatalogueCategory[]>('/admin/categories');
export const getAdminOrders = () => adminRequest<ApiPage<OrderResponse>>('/admin/orders?page=0&size=100&sort=createdAt,desc');

export function updateOrderStatus(id: string, status: string, paymentStatus: string, note = '') {
  return adminRequest<OrderResponse>(`/admin/orders/${id}/status`, {
    method: 'PATCH', body: JSON.stringify({ status, paymentStatus, note })
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

async function adminRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !(init.body instanceof FormData)) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${API_BASE_URL}${path}`, { ...init, headers });
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
