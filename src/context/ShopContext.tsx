import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { isAccountView, type AccountTab, type CatalogueCategory, type CartItem, type Product, type ProductCategory, type ViewType } from '../types';
import { CatalogueRequestError, loadCatalogue, recordWishlistAdd, type ApiProduct } from '../services/catalogService';
import { pageTitle, parseRoute, routePath, type Route } from '../lib/routes';

type CatalogueStatus = 'loading' | 'ready' | 'error';
type RootCategoryId = string | 'all';

interface ShopContextType {
  currentView: ViewType;
  selectedProductId: string | null;
  selectedCategory: ProductCategory | 'all';
  selectedRootCategoryId: RootCategoryId;
  selectedGender: 'men' | 'women' | 'all';
  /**
   * Opens a page and gives it its own web address. orderNumber opens that order in My Account, or
   * names the order a contact message is about; replace swaps the address instead of adding a
   * browser history step (used for account tabs).
   */
  navigateTo: (view: ViewType, params?: {
    productId?: string; category?: ProductCategory | 'all'; rootCategoryId?: RootCategoryId; gender?: 'men' | 'women' | 'all';
    accountTab?: AccountTab; orderNumber?: string; replace?: boolean;
  }) => void;
  returnView: ViewType;
  accountTab: AccountTab;
  /** The order open in My Account, by its order number. */
  accountOrderNumber: string | null;
  /** The order a contact message is about, when the customer came from that order. */
  contactOrderNumber: string | null;
  categories: CatalogueCategory[];
  catalogueStatus: CatalogueStatus;
  catalogueError: string | null;
  /** True while the catalogue is still loading because the server is waking up. */
  catalogueWaking: boolean;
  reloadCatalogue: () => Promise<void>;
  /** Fetches the latest stock and prices in the background, without a loading screen. */
  refreshStock: () => void;
  /**
   * How many of a piece can still be bought, from the latest catalogue: 0 when it is out of stock or no
   * longer in the shop, null while the catalogue hasn't loaded (so nothing is blocked by mistake).
   */
  stockOf: (productId: string) => number | null;
  products: Product[];
  currentProduct: Product | null;
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  addToCart: (product: Product, size?: string, quantity?: number) => void;
  removeFromCart: (productId: string, size?: string) => void;
  updateQuantity: (productId: string, size: string | undefined, delta: number) => void;
  clearCart: () => void;
  /** The piece being bought on its own with Buy Now; checkout shows only this and leaves the bag alone. */
  buyNowItem: CartItem | null;
  /** Opens checkout for this one piece. Callers make sure the customer is signed in first (see useBuyNow). */
  buyNow: (product: Product, size?: string, quantity?: number) => void;
  endBuyNow: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  wishlist: string[];
  wishlistCount: number;
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  isWishlistOpen: boolean;
  setIsWishlistOpen: (open: boolean) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  quickViewProduct: Product | null;
  setQuickViewProduct: (product: Product | null) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);
const FALLBACK_PRODUCT_IMAGE = '/images/hero_silver_ring.jpg';

/** The short care guide shown on every product page; the full guide is the Jewellery Care Guide page. */
const CARE_GUIDE: Product['careGuide'] = [
  { title: 'Why Silver Tarnishes', text: 'Silver naturally reacts with sulphur compounds in the air, causing gradual darkening or dullness. This is normal and not necessarily a sign of poor quality.' },
  { title: 'Genuine Silver', text: 'Tarnishing is a natural characteristic of silver, but its presence or absence alone cannot determine authenticity.' },
  { title: 'Avoid Exposure', text: 'Keep jewellery away from water, perfumes, lotions, chemicals, sanitizers and excessive moisture.' },
  { title: 'Proper Care & Storage', text: 'Store jewellery in airtight pouches or boxes and clean gently using a soft, dry silver polishing cloth.' },
  { title: 'Protect Its Beauty', text: 'Remove jewellery during workouts, household chores and activities that may cause scratches or physical damage.' },
];

/** Follows category slugs down the tree, for example ["men", "rings"]. Null when a slug doesn't match. */
function resolveCategoryPath(categories: CatalogueCategory[], slugs: string[]): { rootId: RootCategoryId; categoryId: ProductCategory | 'all' } | null {
  if (slugs.length === 0) return { rootId: 'all', categoryId: 'all' };
  let level = categories;
  const chain: CatalogueCategory[] = [];
  for (const slug of slugs) {
    const match = level.find((category) => category.slug === slug);
    if (!match) return null;
    chain.push(match);
    level = match.children;
  }
  return { rootId: chain[0].id, categoryId: chain.length > 1 ? chain[chain.length - 1].id : 'all' };
}

// Read once when the shop opens. The address is never rewritten here on load, so Supabase can still
// read the details an email link adds to it.
const startRoute: Route = parseRoute(window.location.pathname, window.location.search);

function flattenCategories(categories: CatalogueCategory[]): CatalogueCategory[] {
  return categories.flatMap((category) => [category, ...flattenCategories(category.children)]);
}

function mapProduct(apiProduct: ApiProduct, categoriesById: Map<string, CatalogueCategory>, rootsByCategoryId: Map<string, CatalogueCategory>): Product {
  const assigned = apiProduct.categoryIds.map((id) => categoriesById.get(id)).filter((category): category is CatalogueCategory => Boolean(category));
  const primaryCategory = assigned.find((category) => category.categoryType === 'collection') ?? assigned[0];
  const roots = [...new Map(apiProduct.categoryIds.map((id) => {
    const root = rootsByCategoryId.get(id);
    return root ? [root.id, root] : undefined;
  }).filter((entry): entry is [string, CatalogueCategory] => Boolean(entry))).values()];
  const images = [...apiProduct.images].sort((a, b) => a.displayOrder - b.displayOrder)
    .map((image) => image.imageUrl).filter((url): url is string => Boolean(url));
  if (images.length === 0 && apiProduct.imageUrl) images.push(apiProduct.imageUrl);
  if (images.length === 0) images.push(FALLBACK_PRODUCT_IMAGE);

  return {
    id: apiProduct.id,
    name: apiProduct.name,
    subtitle: apiProduct.sku ? `Reference ${apiProduct.sku}` : 'Certified 925 sterling silver',
    slug: apiProduct.slug,
    category: primaryCategory?.slug ?? 'collection',
    categoryIds: apiProduct.categoryIds,
    gender: roots.length === 1 ? roots[0].slug : 'collection',
    price: Number(apiProduct.price),
    // Only a real reduction counts; the server already drops an original price that isn't higher.
    originalPrice: apiProduct.originalPrice != null && Number(apiProduct.originalPrice) > Number(apiProduct.price)
      ? Number(apiProduct.originalPrice) : undefined,
    inStock: apiProduct.stockQuantity > 0,
    stockQuantity: Math.max(0, apiProduct.stockQuantity),
    isNew: false,
    isFeatured: true,
    images,
    description: apiProduct.description,
    material: '925 Sterling Silver',
    purity: 'Certified 925 Silver',
    finish: 'Artisan finished',
    weightGrams: apiProduct.weightGrams == null ? undefined : Number(apiProduct.weightGrams),
    availableSizes: [],
    details: [...(apiProduct.sku ? [`Reference: ${apiProduct.sku}`] : []),
      `Availability: ${apiProduct.stockQuantity > 0 ? `${apiProduct.stockQuantity} in stock` : 'Out of stock'}`],
    careGuide: CARE_GUIDE,
    shippingInfo: 'Complimentary insured delivery. Dispatch availability is confirmed at checkout.',
  };
}

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewType>(startRoute.view === 'admin' ? 'home' : startRoute.view);
  // A product id, or a slug from the address until the catalogue arrives.
  const [selectedProductId, setSelectedProductId] = useState<string | null>(startRoute.productKey ?? null);
  // Category slugs from the address, applied once the category tree has loaded.
  const [pendingCategoryPath, setPendingCategoryPath] = useState<string[] | null>(startRoute.view === 'collection' ? startRoute.categoryPath ?? [] : null);
  const [accountTab, setAccountTab] = useState<AccountTab>(startRoute.accountTab ?? 'orders');
  const [accountOrderNumber, setAccountOrderNumber] = useState<string | null>(startRoute.view === 'account' ? startRoute.orderNumber ?? null : null);
  const [contactOrderNumber, setContactOrderNumber] = useState<string | null>(startRoute.view === 'contact' ? startRoute.orderNumber ?? null : null);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [selectedRootCategoryId, setSelectedRootCategoryId] = useState<RootCategoryId>('all');
  const [selectedGender, setSelectedGender] = useState<'men' | 'women' | 'all'>('all');
  const [returnView, setReturnView] = useState<ViewType>('home');
  const [categories, setCategories] = useState<CatalogueCategory[]>([]);
  const [apiProducts, setApiProducts] = useState<ApiProduct[]>([]);
  const [catalogueStatus, setCatalogueStatus] = useState<CatalogueStatus>('loading');
  const [catalogueError, setCatalogueError] = useState<string | null>(null);
  const [catalogueWaking, setCatalogueWaking] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(() => { try { return JSON.parse(localStorage.getItem('silvesto_cart') ?? '[]') as CartItem[]; } catch { return []; } });
  const [wishlist, setWishlist] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('silvesto_wishlist') ?? '[]') as string[]; } catch { return []; } });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [buyNowItem, setBuyNowItem] = useState<CartItem | null>(null);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const categoryIndex = useMemo(() => {
    const categoriesById = new Map(flattenCategories(categories).map((category) => [category.id, category]));
    const rootsByCategoryId = new Map<string, CatalogueCategory>();
    const register = (category: CatalogueCategory, root: CatalogueCategory) => {
      rootsByCategoryId.set(category.id, root);
      category.children.forEach((child) => register(child, root));
    };
    categories.forEach((root) => register(root, root));
    return { categoriesById, rootsByCategoryId };
  }, [categories]);
  const products = useMemo(() => apiProducts.map((product) => mapProduct(product, categoryIndex.categoriesById, categoryIndex.rootsByCategoryId)), [apiProducts, categoryIndex]);

  // When the catalogue last arrived, so the stock shown is never more than a minute or so old.
  const catalogueLoadedAt = useRef(0);
  const reloadCatalogue = useCallback(async () => {
    setCatalogueStatus('loading');
    setCatalogueError(null);
    setCatalogueWaking(false);
    try {
      const catalogue = await loadCatalogue(undefined, () => setCatalogueWaking(true));
      setCategories(catalogue.categories);
      setApiProducts(catalogue.products);
      catalogueLoadedAt.current = Date.now();
      setCatalogueStatus('ready');
    } catch (error) {
      setCatalogueStatus('error');
      setCatalogueError(error instanceof CatalogueRequestError && error.retryable
        ? 'The collection is taking longer than usual to open. Please try again in a moment.'
        : error instanceof Error ? error.message : 'Unable to load the catalogue.');
    } finally {
      setCatalogueWaking(false);
    }
  }, []);

  useEffect(() => { void reloadCatalogue(); }, [reloadCatalogue]);

  // Stock changes as people buy, so the shop quietly fetches it again: every minute while the page is open
  // and in view, and whenever the customer comes back to the tab. A failed refresh keeps what is shown.
  const refreshing = useRef(false);
  const refreshStock = useCallback(() => {
    if (refreshing.current || catalogueLoadedAt.current === 0) return;
    refreshing.current = true;
    loadCatalogue()
      .then((catalogue) => {
        setCategories(catalogue.categories);
        setApiProducts(catalogue.products);
        catalogueLoadedAt.current = Date.now();
      })
      .catch(() => undefined)
      .finally(() => { refreshing.current = false; });
  }, []);
  useEffect(() => {
    const STALE_AFTER = 60_000;
    const refreshIfStale = () => {
      if (document.visibilityState === 'visible' && Date.now() - catalogueLoadedAt.current >= STALE_AFTER) refreshStock();
    };
    const timer = window.setInterval(refreshIfStale, STALE_AFTER);
    document.addEventListener('visibilitychange', refreshIfStale);
    window.addEventListener('focus', refreshIfStale);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refreshIfStale);
      window.removeEventListener('focus', refreshIfStale);
    };
  }, [refreshStock]);
  useEffect(() => { try { localStorage.setItem('silvesto_cart', JSON.stringify(cart)); } catch { /* storage unavailable */ } }, [cart]);
  useEffect(() => { try { localStorage.setItem('silvesto_wishlist', JSON.stringify(wishlist)); } catch { /* storage unavailable */ } }, [wishlist]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [currentView, selectedProductId, accountOrderNumber]);

  // The browser's back and forward buttons show the page their address names.
  useEffect(() => {
    const showAddress = () => {
      const route = parseRoute(window.location.pathname, window.location.search);
      setCurrentView(route.view === 'admin' ? 'home' : route.view);
      if (route.productKey) setSelectedProductId(route.productKey);
      setPendingCategoryPath(route.view === 'collection' ? route.categoryPath ?? [] : null);
      setAccountTab(route.accountTab ?? 'orders');
      setAccountOrderNumber(route.view === 'account' ? route.orderNumber ?? null : null);
      setContactOrderNumber(route.view === 'contact' ? route.orderNumber ?? null : null);
      setIsSearchOpen(false);
    };
    window.addEventListener('popstate', showAddress);
    return () => window.removeEventListener('popstate', showAddress);
  }, []);

  const resolvedPath = pendingCategoryPath && categories.length > 0 ? resolveCategoryPath(categories, pendingCategoryPath) : null;
  const effectiveRootId = pendingCategoryPath ? resolvedPath?.rootId ?? 'all' : selectedRootCategoryId;
  const effectiveCategory = pendingCategoryPath ? resolvedPath?.categoryId ?? 'all' : selectedCategory;

  /** Slugs from the top of the tree down to the chosen category, for its address. */
  const categoryPathOf = (categoryId: ProductCategory | 'all', rootId: RootCategoryId): string[] => {
    const slugs: string[] = [];
    let node = categoryIndex.categoriesById.get(categoryId !== 'all' ? categoryId : rootId);
    while (node) {
      slugs.unshift(node.slug);
      node = node.parentId ? categoryIndex.categoriesById.get(node.parentId) : undefined;
    }
    return slugs;
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage((current) => current === message ? null : current), 3200);
  };
  const navigateTo: ShopContextType['navigateTo'] = (view, params) => {
    if (!isAccountView(currentView)) setReturnView(currentView);
    setCurrentView(view);
    if (pendingCategoryPath) {
      setPendingCategoryPath(null);
      setSelectedRootCategoryId(effectiveRootId);
      setSelectedCategory(effectiveCategory);
    }
    if (params?.productId) setSelectedProductId(params.productId);
    if (params?.category !== undefined) setSelectedCategory(params.category);
    if (params?.rootCategoryId !== undefined) setSelectedRootCategoryId(params.rootCategoryId);
    else if (params?.gender === 'all') setSelectedRootCategoryId('all');
    if (params?.gender !== undefined) setSelectedGender(params.gender);
    setIsSearchOpen(false);

    // My Account keeps its place across sign-in (an emailed order link still opens after signing in),
    // but opens on the order list when reached from anywhere else.
    let tab = accountTab;
    let order = accountOrderNumber;
    if (view === 'account' && (params?.accountTab !== undefined || params?.orderNumber !== undefined)) {
      tab = params.accountTab ?? 'orders';
      order = params.orderNumber ?? null;
    } else if (view === 'account' && !isAccountView(currentView)) {
      tab = 'orders';
      order = null;
    }
    setAccountTab(tab);
    setAccountOrderNumber(order);
    const aboutOrder = view === 'contact' ? params?.orderNumber ?? null : null;
    setContactOrderNumber(aboutOrder);

    const productId = params?.productId ?? selectedProductId;
    const product = productId ? products.find((candidate) => candidate.id === productId || candidate.slug === productId) : undefined;
    const category = params?.category !== undefined ? params.category : effectiveCategory;
    const rootId = params?.rootCategoryId !== undefined ? params.rootCategoryId : params?.gender === 'all' ? 'all' : effectiveRootId;
    const path = routePath({
      view,
      productKey: product?.slug || productId || undefined,
      categoryPath: view === 'collection' ? categoryPathOf(category, rootId) : undefined,
      accountTab: tab,
      orderNumber: view === 'account' ? order ?? undefined : aboutOrder ?? undefined,
    });
    if (path !== window.location.pathname + window.location.search) {
      if (params?.replace) window.history.replaceState(null, '', path);
      else window.history.pushState(null, '', path);
    }
  };
  const currentProduct = selectedProductId
    ? products.find((product) => product.id === selectedProductId || product.slug === selectedProductId) ?? null : null;

  useEffect(() => { document.title = pageTitle(currentView, currentProduct?.name); }, [currentView, currentProduct?.name]);
  const stockOf = (productId: string): number | null => {
    if (catalogueLoadedAt.current === 0) return null;
    return products.find((product) => product.id === productId)?.stockQuantity ?? 0;
  };
  // A bag saved before stock was tracked has no count on its pieces, so the live catalogue comes first.
  const availableOf = (product: Product) => stockOf(product.id) ?? product.stockQuantity ?? Number.POSITIVE_INFINITY;
  const inBag = (productId: string) => cart.filter((item) => item.product.id === productId).reduce((total, item) => total + item.quantity, 0);

  // The shop never adds more than is left. The server checks again when the order is placed.
  const addToCart = (product: Product, size?: string, quantity = 1) => {
    const available = availableOf(product);
    if (available <= 0) { showToast(`Sorry, "${product.name}" is out of stock.`); return; }
    const room = available - inBag(product.id);
    if (room <= 0) {
      showToast(`Your bag already has all ${available} of "${product.name}" that are left.`);
      setIsCartOpen(true);
      return;
    }
    const adding = Math.min(quantity, room);
    const selectedSize = size || product.availableSizes?.[0] || 'Standard';
    setCart((previous) => {
      const index = previous.findIndex((item) => item.product.id === product.id && item.selectedSize === selectedSize);
      return index < 0 ? [...previous, { product, selectedSize, quantity: adding }] : previous.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: item.quantity + adding } : item);
    });
    showToast(adding < quantity
      ? `Only ${available} of "${product.name}" left, so ${adding === 1 ? '1 was' : `${adding} were`} added to your bag.`
      : `Added "${product.name}" to your shopping bag.`);
    setIsCartOpen(true);
  };
  const buyNow = (product: Product, size?: string, quantity = 1) => {
    const available = availableOf(product);
    if (available <= 0) { showToast(`Sorry, "${product.name}" is out of stock.`); return; }
    setBuyNowItem({ product, selectedSize: size || product.availableSizes?.[0] || 'Standard', quantity: Math.min(quantity, available) });
    setIsCartOpen(true);
  };
  const removeFromCart = (productId: string, size?: string) => { setCart((previous) => previous.filter((item) => !(item.product.id === productId && item.selectedSize === size))); showToast('Item removed from shopping bag.'); };
  const updateQuantity = (productId: string, size: string | undefined, delta: number) => {
    const available = stockOf(productId);
    if (delta > 0 && available !== null && inBag(productId) + delta > available) {
      showToast(available === 0 ? 'Sorry, this piece is out of stock.' : `Only ${available} of this piece left.`);
      return;
    }
    setCart((previous) => previous.map((item) => item.product.id === productId && item.selectedSize === size ? { ...item, quantity: item.quantity + delta } : item).filter((item) => item.quantity > 0));
  };
  const toggleWishlist = (productId: string) => {
    if (wishlist.includes(productId)) { setWishlist((previous) => previous.filter((id) => id !== productId)); showToast('Removed from your wishlist.'); return; }
    setWishlist((previous) => [...previous, productId]);
    recordWishlistAdd(productId);
    showToast(`Saved "${products.find((product) => product.id === productId)?.name ?? 'piece'}" to your wishlist.`);
  };

  return <ShopContext.Provider value={{
    currentView, selectedProductId, selectedCategory: effectiveCategory, selectedRootCategoryId: effectiveRootId, selectedGender, navigateTo, returnView,
    accountTab, accountOrderNumber, contactOrderNumber,
    categories, catalogueStatus, catalogueError, catalogueWaking, reloadCatalogue, refreshStock, stockOf, products, currentProduct,
    cart, cartCount: cart.reduce((total, item) => total + item.quantity, 0), cartSubtotal: cart.reduce((total, item) => total + item.product.price * item.quantity, 0), addToCart, removeFromCart, updateQuantity, clearCart: () => setCart([]),
    buyNowItem, buyNow, endBuyNow: () => setBuyNowItem(null), isCartOpen, setIsCartOpen,
    wishlist, wishlistCount: wishlist.length, toggleWishlist, isWishlisted: (productId) => wishlist.includes(productId), isWishlistOpen, setIsWishlistOpen,
    searchQuery, setSearchQuery, isSearchOpen, setIsSearchOpen, quickViewProduct, setQuickViewProduct, toastMessage, showToast,
  }}>{children}</ShopContext.Provider>;
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) throw new Error('useShop must be used within a ShopProvider');
  return context;
};
