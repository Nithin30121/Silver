/** Category identifiers are database UUIDs, so new collections require no frontend release. */
export type ProductCategory = string;
export type GenderCategory = 'men' | 'women' | 'all';

export interface CatalogueCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  categoryType: 'audience' | 'collection' | 'items' | 'landing_page';
  description: string;
  imageUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  children: CatalogueCategory[];
}

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  slug: string;
  category: ProductCategory;
  categoryIds: string[];
  gender: string;
  price: number;
  originalPrice?: number;
  inStock: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  images: string[];
  description: string;
  material: string;
  purity: string;
  finish: string;
  weightGrams?: number;
  availableSizes?: string[];
  dimensions?: string;
  details: string[];
  careGuide: string[];
  shippingInfo: string;
}

export interface CartItem {
  product: Product;
  selectedSize?: string;
  quantity: number;
}

export type ViewType = 
  | 'home' 
  | 'collection' 
  | 'men' 
  | 'women' 
  | 'product' 
  | 'story' 
  | 'care' 
  | 'shipping' 
  | 'contact' 
  | 'faq'
  | 'privacy'
  | 'terms'
  | 'admin'
  | AccountView;

/** Pages belonging to customer accounts (sign-in, sign-up, password reset, account details). */
export type AccountView = 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'account';

export const ACCOUNT_VIEWS: readonly AccountView[] = ['login', 'signup', 'forgot-password', 'reset-password', 'account'];

export const isAccountView = (view: ViewType): view is AccountView =>
  (ACCOUNT_VIEWS as readonly ViewType[]).includes(view);

/** A customer's profile row from Supabase (see supabase/migrations). */
export interface CustomerProfile {
  id: string;
  fullName: string;
  email: string | null;
  role: 'customer' | 'admin';
  createdAt: string;
  updatedAt: string;
}

export interface NavigationState {
  view: ViewType;
  productId?: string;
  categoryFilter?: ProductCategory | 'all';
}
