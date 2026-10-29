import type { CatalogueCategory } from '../types';

const configuredBaseUrl = import.meta.env.VITE_CATALOG_API_URL?.trim();
const API_BASE_URL = (configuredBaseUrl || 'http://localhost:8080/api').replace(/\/$/, '');

interface ApiImage {
  id: string;
  imageUrl: string | null;
  altText: string;
  displayOrder: number;
}

export interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  description: string;
  price: number | string;
  imageUrl: string | null;
  weightGrams: number | string | null;
  stockQuantity: number;
  isActive: boolean;
  categoryIds: string[];
  images: ApiImage[];
}

interface ProductPage {
  content: ApiProduct[];
  totalPages?: number;
  page?: {
    totalPages: number;
  };
}

export interface CatalogueSnapshot {
  categories: CatalogueCategory[];
  products: ApiProduct[];
}

/**
 * The API runs on a free server that sleeps when nobody has visited for a while and takes 30 to
 * 50 seconds to wake. While it wakes, or restarts after a deploy, the browser can't reach it or it
 * answers 502 to 504, so those failures are retried with these pauses, about a minute in all.
 */
const WAKE_RETRY_DELAYS_MS = [2000, 3000, 5000, 5000, 8000, 10000, 10000, 10000, 10000];

/** retryable is true when the server looks asleep or mid-restart rather than truly failing. */
export class CatalogueRequestError extends Error {
  readonly retryable: boolean;

  constructor(message: string, retryable: boolean) {
    super(message);
    this.name = 'CatalogueRequestError';
    this.retryable = retryable;
  }
}

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      signal,
      headers: { Accept: 'application/json' },
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new CatalogueRequestError('The shop could not be reached.', true);
  }

  if (!response.ok) {
    throw new CatalogueRequestError(`Catalogue request failed (${response.status}).`, response.status >= 502 && response.status <= 504);
  }

  return response.json() as Promise<T>;
}

function pause(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener('abort', () => { clearTimeout(timer); reject(signal.reason); }, { once: true });
  });
}

async function allProducts(signal?: AbortSignal): Promise<ApiProduct[]> {
  const products: ApiProduct[] = [];
  let page = 0;

  do {
    const response = await request<ProductPage>(`/products?page=${page}&size=100&sort=name,asc`, signal);
    products.push(...response.content);
    page += 1;
    const totalPages = response.totalPages ?? response.page?.totalPages ?? 0;
    if (page >= totalPages) break;
  } while (true);

  return products;
}

/**
 * Fetches fresh public catalogue data on each application load. If the server is still waking up,
 * onWaking is called once and the whole load is tried again until the pauses run out.
 */
export async function loadCatalogue(signal?: AbortSignal, onWaking?: () => void): Promise<CatalogueSnapshot> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      const [categories, products] = await Promise.all([
        request<CatalogueCategory[]>('/categories', signal),
        allProducts(signal),
      ]);
      return { categories, products };
    } catch (error) {
      const delay = WAKE_RETRY_DELAYS_MS[attempt];
      if (!(error instanceof CatalogueRequestError) || !error.retryable || delay === undefined || signal?.aborted) throw error;
      if (attempt === 0) onWaking?.();
      await pause(delay, signal);
    }
  }
}
