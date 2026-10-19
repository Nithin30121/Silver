import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Product, CartItem, ViewType, ProductCategory } from '../types';
import { PRODUCTS } from '../data/products';

interface ShopContextType {
  // Navigation
  currentView: ViewType;
  selectedProductId: string | null;
  selectedCategory: ProductCategory | 'all';
  selectedGender: 'men' | 'women' | 'all';
  navigateTo: (view: ViewType, params?: { productId?: string; category?: ProductCategory | 'all'; gender?: 'men' | 'women' | 'all' }) => void;
  
  // Products
  products: Product[];
  currentProduct: Product | null;
  
  // Cart
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  addToCart: (product: Product, size?: string, quantity?: number) => void;
  removeFromCart: (productId: string, size?: string) => void;
  updateQuantity: (productId: string, size: string | undefined, delta: number) => void;
  clearCart: () => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  
  // Wishlist
  wishlist: string[];
  wishlistCount: number;
  toggleWishlist: (productId: string) => void;
  isWishlisted: (productId: string) => boolean;
  isWishlistOpen: boolean;
  setIsWishlistOpen: (open: boolean) => void;
  
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
  
  // Quick View
  quickViewProduct: Product | null;
  setQuickViewProduct: (product: Product | null) => void;
  
  // Notification Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const ShopContext = createContext<ShopContextType | undefined>(undefined);

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState<ViewType>('home');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'all'>('all');
  const [selectedGender, setSelectedGender] = useState<'men' | 'women' | 'all'>('all');

  // Load cart from localStorage
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('silvesto_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Load wishlist from localStorage
  const [wishlist, setWishlist] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('silvesto_wishlist');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('silvesto_cart', JSON.stringify(cart));
    } catch {
      // storage error
    }
  }, [cart]);

  // Sync wishlist to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('silvesto_wishlist', JSON.stringify(wishlist));
    } catch {
      // storage error
    }
  }, [wishlist]);

  // Scroll to top upon view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentView, selectedProductId]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3200);
  };

  const navigateTo = (
    view: ViewType,
    params?: { productId?: string; category?: ProductCategory | 'all'; gender?: 'men' | 'women' | 'all' }
  ) => {
    setCurrentView(view);
    if (params?.productId) setSelectedProductId(params.productId);
    if (params?.category !== undefined) setSelectedCategory(params.category);
    if (params?.gender !== undefined) setSelectedGender(params.gender);
    setIsSearchOpen(false);
  };

  const currentProduct = selectedProductId 
    ? PRODUCTS.find(p => p.id === selectedProductId) || null 
    : null;

  const addToCart = (product: Product, size?: string, quantity: number = 1) => {
    const chosenSize = size || (product.availableSizes && product.availableSizes[0]) || 'Standard';
    setCart(prev => {
      const existingIndex = prev.findIndex(
        item => item.product.id === product.id && item.selectedSize === chosenSize
      );
      if (existingIndex > -1) {
        const next = [...prev];
        next[existingIndex].quantity += quantity;
        return next;
      }
      return [...prev, { product, selectedSize: chosenSize, quantity }];
    });
    showToast(`Added "${product.name}" to your shopping bag.`);
    setIsCartOpen(true);
  };

  const removeFromCart = (productId: string, size?: string) => {
    setCart(prev => prev.filter(item => !(item.product.id === productId && item.selectedSize === size)));
    showToast('Item removed from shopping bag.');
  };

  const updateQuantity = (productId: string, size: string | undefined, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id === productId && item.selectedSize === size) {
          const nextQty = item.quantity + delta;
          return nextQty > 0 ? { ...item, quantity: nextQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const clearCart = () => {
    setCart([]);
  };

  const toggleWishlist = (productId: string) => {
    const isSaved = wishlist.includes(productId);
    if (isSaved) {
      setWishlist(prev => prev.filter(id => id !== productId));
      showToast('Removed from your wishlist.');
    } else {
      setWishlist(prev => [...prev, productId]);
      const product = PRODUCTS.find(p => p.id === productId);
      showToast(`Saved "${product?.name || 'piece'}" to wishlist.`);
    }
  };

  const isWishlisted = (productId: string) => wishlist.includes(productId);

  const cartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cart.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  const wishlistCount = wishlist.length;

  return (
    <ShopContext.Provider
      value={{
        currentView,
        selectedProductId,
        selectedCategory,
        selectedGender,
        navigateTo,
        products: PRODUCTS,
        currentProduct,
        cart,
        cartCount,
        cartSubtotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        setIsCartOpen,
        wishlist,
        wishlistCount,
        toggleWishlist,
        isWishlisted,
        isWishlistOpen,
        setIsWishlistOpen,
        searchQuery,
        setSearchQuery,
        isSearchOpen,
        setIsSearchOpen,
        quickViewProduct,
        setQuickViewProduct,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export const useShop = () => {
  const context = useContext(ShopContext);
  if (!context) throw new Error('useShop must be used within a ShopProvider');
  return context;
};
