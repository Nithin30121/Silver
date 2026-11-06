import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import type { Product } from '../types';

/**
 * Buy Now: checkout for one piece, skipping the bag. Orders need an account, so a signed-out
 * customer goes to sign in first and comes back to the same piece afterwards.
 */
export function useBuyNow() {
  const { buyNow, navigateTo, showToast } = useShop();
  const { status } = useAuth();
  return (product: Product, size?: string, quantity = 1) => {
    if (status !== 'authenticated') {
      navigateTo('login');
      showToast('Please sign in to buy this piece.');
      return;
    }
    buyNow(product, size, quantity);
  };
}
