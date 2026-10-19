export type ProductCategory = 'rings' | 'bracelets' | 'necklaces' | 'earrings';
export type GenderCategory = 'men' | 'women' | 'all';

export interface Product {
  id: string;
  name: string;
  subtitle: string;
  slug: string;
  category: ProductCategory;
  gender: 'men' | 'women' | 'unisex';
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
  | 'terms';

export interface NavigationState {
  view: ViewType;
  productId?: string;
  categoryFilter?: ProductCategory | 'all';
}
