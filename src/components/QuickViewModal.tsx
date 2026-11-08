import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import type { Product } from '../types';
import { AnimatedModal } from './AnimatedModal';
import { PriceTag } from './PriceTag';
import { useBuyNow } from '../lib/useBuyNow';
import { X, ShoppingBag, Heart, ArrowRight } from 'lucide-react';

export const QuickViewModal: React.FC = () => {
  const { quickViewProduct, setQuickViewProduct } = useShop();

  return (
    <AnimatedModal
      open={quickViewProduct !== null}
      onClose={() => setQuickViewProduct(null)}
      panelStyle={{ maxWidth: '780px', padding: '0', display: 'grid', gridTemplateColumns: '1fr 1fr', backgroundColor: 'var(--color-ink)', border: '1px solid rgba(var(--rgb-line), 0.35)' }}
    >
      {quickViewProduct && <QuickViewDetails key={quickViewProduct.id} product={quickViewProduct} />}
    </AnimatedModal>
  );
};

/** The product shown in quick view; kept as its own component so it stays on screen while the modal closes. */
const QuickViewDetails: React.FC<{ product: Product }> = ({ product }) => {
  const {
    setQuickViewProduct,
    addToCart,
    isWishlisted,
    toggleWishlist,
    navigateTo
  } = useShop();
  const buyNow = useBuyNow();

  const [selectedSize, setSelectedSize] = useState<string>(product.availableSizes?.[0] ?? 'Standard');

  const wishlisted = isWishlisted(product.id);


  return (
    <>
      {/* Left: Product Image */}
      <div style={{ backgroundColor: 'var(--color-band)', height: '100%', minHeight: '380px', position: 'relative' }}>
        <img
          src={product.images[0]}
          alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <span className="product-badge-tag" style={{ top: '1rem', left: '1rem' }}>
          {product.purity}
        </span>
      </div>

      {/* Right: Quick Controls */}
      <div style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', backgroundColor: 'var(--color-ink)' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <span className="eyebrow">{product.category}</span>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.65rem', lineHeight: '1.2', color: 'var(--color-text)' }}>
                {product.name}
              </h3>
            </div>
            <button onClick={() => setQuickViewProduct(null)} aria-label="Close modal" style={{ color: 'var(--color-text)' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <PriceTag price={product.price} originalPrice={product.originalPrice} size="modal" />
          </div>

          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: '1.65', marginBottom: '1.5rem' }}>
            {product.subtitle}. {product.description}
          </p>

          {/* Sizes */}
          {product.availableSizes && product.availableSizes.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-text)' }}>
                Select Size:
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {product.availableSizes.map((sz) => (
                  <button
                    key={sz}
                    onClick={() => setSelectedSize(sz)}
                    style={{
                      padding: '0.45rem 0.85rem',
                      fontSize: '0.75rem',
                      border: selectedSize === sz ? '1px solid var(--color-silver-deep)' : '1px solid rgba(var(--rgb-line), 0.25)',
                      backgroundColor: selectedSize === sz ? 'rgba(var(--rgb-panel), 0.95)' : 'var(--color-graphite)',
                      color: selectedSize === sz ? 'var(--color-silver-highlight)' : 'var(--color-text)',
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
              className="btn-secondary"
              style={{ flex: 1, padding: '0.85rem' }}
              onClick={() => {
                addToCart(product, selectedSize, 1);
                setQuickViewProduct(null);
              }}
            >
              <ShoppingBag size={14} />
              <span>Add to Bag</span>
            </button>

            <button
              style={{
                width: '46px',
                border: '1px solid rgba(var(--rgb-line), 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: wishlisted ? 'var(--color-graphite)' : 'var(--color-graphite)',
                color: wishlisted ? 'var(--color-silver-accent)' : 'var(--color-text)'
              }}
              onClick={() => toggleWishlist(product.id)}
              aria-label="Wishlist toggle"
            >
              <Heart size={16} style={{ fill: wishlisted ? 'var(--color-silver-accent)' : 'none' }} />
            </button>
          </div>

          <button
            className="btn-primary"
            style={{ width: '100%', padding: '0.95rem' }}
            onClick={() => {
              setQuickViewProduct(null);
              buyNow(product, selectedSize, 1);
            }}
          >
            <span>Buy Now</span>
            <ArrowRight size={14} />
          </button>

          <button
            className="btn-text"
            style={{ justifyContent: 'center', fontSize: '0.75rem' }}
            onClick={() => {
              const id = product.id;
              setQuickViewProduct(null);
              navigateTo('product', { productId: id });
            }}
          >
            <span>View Full Details & Sizing Guide</span>
            <ArrowRight size={12} />
          </button>
        </div>
      </div>
    </>
  );
};
