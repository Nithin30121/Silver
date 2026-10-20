import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { X, ShoppingBag, Heart, ArrowRight } from 'lucide-react';

export const QuickViewModal: React.FC = () => {
  const {
    quickViewProduct,
    setQuickViewProduct,
    addToCart,
    isWishlisted,
    toggleWishlist,
    navigateTo
  } = useShop();

  if (!quickViewProduct) return null;

  const [selectedSize, setSelectedSize] = useState<string>(
    quickViewProduct.availableSizes ? quickViewProduct.availableSizes[0] : 'Standard'
  );

  const wishlisted = isWishlisted(quickViewProduct.id);

  const formattedPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(quickViewProduct.price);

  return (
    <div className="modal-backdrop open" onClick={() => setQuickViewProduct(null)}>
      <div
        className="modal-panel"
        style={{ maxWidth: '780px', padding: '0', display: 'grid', gridTemplateColumns: '1fr 1fr', backgroundColor: '#100D0B', border: '1px solid rgba(184, 121, 81, 0.35)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Left: Product Image */}
        <div style={{ backgroundColor: '#0c0a09', height: '100%', minHeight: '380px', position: 'relative' }}>
          <img
            src={quickViewProduct.images[0]}
            alt={quickViewProduct.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <span className="product-badge-tag" style={{ top: '1rem', left: '1rem' }}>
            {quickViewProduct.purity}
          </span>
        </div>

        {/* Right: Quick Controls */}
        <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: '#100D0B' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <span className="eyebrow">{quickViewProduct.category}</span>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.65rem', lineHeight: '1.2', color: 'var(--color-soft-ivory)' }}>
                  {quickViewProduct.name}
                </h3>
              </div>
              <button onClick={() => setQuickViewProduct(null)} aria-label="Close modal" style={{ color: 'var(--color-soft-ivory)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--color-champagne)', marginBottom: '1rem' }}>
              {formattedPrice}
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--color-muted-grey)', lineHeight: '1.65', marginBottom: '1.5rem' }}>
              {quickViewProduct.subtitle}. {quickViewProduct.description}
            </p>

            {/* Sizes */}
            {quickViewProduct.availableSizes && quickViewProduct.availableSizes.length > 0 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-soft-ivory)' }}>
                  Select Size:
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {quickViewProduct.availableSizes.map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      style={{
                        padding: '0.45rem 0.85rem',
                        fontSize: '0.75rem',
                        border: selectedSize === sz ? '1px solid var(--color-metallic-copper)' : '1px solid rgba(184, 121, 81, 0.25)',
                        backgroundColor: selectedSize === sz ? 'rgba(27, 23, 20, 0.95)' : '#14100E',
                        color: selectedSize === sz ? 'var(--color-champagne)' : 'var(--color-soft-ivory)',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn-primary"
                style={{ flex: 1, padding: '0.85rem' }}
                onClick={() => {
                  addToCart(quickViewProduct, selectedSize, 1);
                  setQuickViewProduct(null);
                }}
              >
                <ShoppingBag size={14} />
                <span>Add to Bag</span>
              </button>

              <button
                style={{
                  width: '46px',
                  border: '1px solid rgba(184, 121, 81, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: wishlisted ? '#181310' : '#14100E',
                  color: wishlisted ? 'var(--color-rose-gold)' : 'var(--color-soft-ivory)'
                }}
                onClick={() => toggleWishlist(quickViewProduct.id)}
                aria-label="Wishlist toggle"
              >
                <Heart size={16} style={{ fill: wishlisted ? 'var(--color-rose-gold)' : 'none' }} />
              </button>
            </div>

            <button
              className="btn-text"
              style={{ justifyContent: 'center', fontSize: '0.75rem' }}
              onClick={() => {
                const id = quickViewProduct.id;
                setQuickViewProduct(null);
                navigateTo('product', { productId: id });
              }}
            >
              <span>View Full Details & Sizing Guide</span>
              <ArrowRight size={12} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
