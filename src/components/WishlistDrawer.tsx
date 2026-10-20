import React from 'react';
import { useShop } from '../context/ShopContext';
import { X, Trash2, ShoppingBag } from 'lucide-react';

export const WishlistDrawer: React.FC = () => {
  const {
    wishlist,
    isWishlistOpen,
    setIsWishlistOpen,
    products,
    toggleWishlist,
    addToCart,
    navigateTo
  } = useShop();

  const wishlistedProducts = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className={`drawer-backdrop ${isWishlistOpen ? 'open' : ''}`} onClick={() => setIsWishlistOpen(false)}>
      <aside
        className={`drawer-panel ${isWishlistOpen ? 'open' : ''}`}
        onClick={(e) => e.stopPropagation()}
        aria-label="Wishlist Drawer"
      >
        <div className="drawer-header">
          <h2 className="drawer-title">Saved Pieces ({wishlist.length})</h2>
          <button onClick={() => setIsWishlistOpen(false)} aria-label="Close wishlist" style={{ color: 'var(--color-soft-ivory)' }}>
            <X size={20} />
          </button>
        </div>

        <div className="drawer-body">
          {wishlistedProducts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <span className="eyebrow">NO SAVED PIECES</span>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--color-soft-ivory)' }}>
                Your wishlist is empty.
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-muted-grey)', marginBottom: '2rem' }}>
                Click the heart icon on any piece to save it for later consideration.
              </p>
              <button
                className="btn-primary"
                onClick={() => {
                  setIsWishlistOpen(false);
                  navigateTo('collection');
                }}
              >
                Browse Collection
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {wishlistedProducts.map((product) => {
                const formattedPrice = new Intl.NumberFormat('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0
                }).format(product.price);

                return (
                  <div
                    key={product.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '80px 1fr auto',
                      gap: '1rem',
                      paddingBottom: '1.25rem',
                      borderBottom: '1px solid rgba(184, 121, 81, 0.2)'
                    }}
                  >
                    {/* Thumbnail */}
                    <div
                      style={{
                        width: '80px',
                        height: '100px',
                        backgroundColor: '#100D0B',
                        border: '1px solid rgba(184, 121, 81, 0.2)',
                        overflow: 'hidden',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setIsWishlistOpen(false);
                        navigateTo('product', { productId: product.id });
                      }}
                    >
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    {/* Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                      <div>
                        <h4
                          style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', cursor: 'pointer', color: 'var(--color-soft-ivory)' }}
                          onClick={() => {
                            setIsWishlistOpen(false);
                            navigateTo('product', { productId: product.id });
                          }}
                        >
                          {product.name}
                        </h4>
                        <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-grey)' }}>
                          {product.material}
                        </span>
                        <div style={{ marginTop: '0.25rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-champagne)' }}>
                          {formattedPrice}
                        </div>
                      </div>

                      <button
                        className="btn-text"
                        style={{ fontSize: '0.6875rem', alignSelf: 'flex-start' }}
                        onClick={() => {
                          addToCart(product);
                          toggleWishlist(product.id);
                        }}
                      >
                        <ShoppingBag size={12} />
                        <span>Move to Bag</span>
                      </button>
                    </div>

                    {/* Remove */}
                    <button
                      style={{ color: 'var(--color-muted-grey)' }}
                      onClick={() => toggleWishlist(product.id)}
                      aria-label="Remove from wishlist"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};
