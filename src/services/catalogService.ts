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

async function request<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    signal,
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`Catalogue request failed (${response.status}).`);
  }

  return response.json() as Promise<T>;
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

/** Fetches fresh public catalogue data on each application load. */
export async function loadCatalogue(signal?: AbortSignal): Promise<CatalogueSnapshot> {
  const [categories, products] = await Promise.all([
    request<CatalogueCategory[]>('/categories', signal),
    allProducts(signal),
  ]);

  return { categories, products };
}
