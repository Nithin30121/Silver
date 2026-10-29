import React from 'react';
import { motion } from 'motion/react';
import { useShop } from '../context/ShopContext';
import type { Product } from '../types';
import { gentleSpring, revealOnScroll, useBumpOnIncrease } from '../lib/motion';
import { Heart, Eye, ArrowRight } from 'lucide-react';

interface ProductCardProps {
  product: Product;
  /** Position in its grid, so cards in a row reveal one after another. */
  index?: number;
}

const pressable = { whileTap: { scale: 0.95 }, transition: gentleSpring };

export const ProductCard: React.FC<ProductCardProps> = ({ product, index = 0 }) => {
  const { navigateTo, isWishlisted, toggleWishlist, addToCart, setQuickViewProduct } = useShop();
  const wishlisted = isWishlisted(product.id);
  const heartRef = useBumpOnIncrease<HTMLSpanElement>(wishlisted ? 1 : 0);

  const formattedPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(product.price);

  const formattedOriginal = product.originalPrice
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0
      }).format(product.originalPrice)
    : null;

  return (
    <motion.div className="reveal-cell" {...revealOnScroll((index % 4) * 0.08)}>
      <motion.article className="product-card" aria-label={product.name} whileHover={{ y: -6 }} transition={gentleSpring}>
        <div className="product-img-wrapper">
          {/* Badges */}
          {product.isNew && <span className="product-badge-tag">NEW</span>}

          {/* Wishlist Button */}
          <button
            className={`product-wishlist-btn ${wishlisted ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleWishlist(product.id);
            }}
            aria-label={wishlisted ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
          >
            <span ref={heartRef} style={{ display: 'flex' }}>
              <Heart
                size={16}
                style={{
                  fill: wishlisted ? 'var(--color-silver-accent)' : 'none',
                  stroke: wishlisted ? 'var(--color-silver-accent)' : 'currentColor',
                  strokeWidth: 1.8
                }}
              />
            </span>
          </button>

          {/* Product Images with Hover Transition */}
          <div
            style={{ width: '100%', height: '100%', cursor: 'pointer' }}
            onClick={() => navigateTo('product', { productId: product.id })}
          >
            <img
              src={product.images[0]}
              alt={product.name}
              className="product-img-primary"
              loading="lazy"
              width={600}
              height={800}
            />
            {product.images[1] && (
              <img
                src={product.images[1]}
                alt={`${product.name} alternate view`}
                className="product-img-alternate"
                loading="lazy"
                width={600}
                height={800}
              />
            )}
          </div>

          {/* Quick Actions Hover Drawer */}
          <div className="product-quick-add">
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
              <motion.button
                {...pressable}
                style={{
                  flex: 1,
                  background: 'rgba(26, 27, 30, 0.95)',
                  border: '1px solid var(--color-silver-deep)',
                  color: 'var(--color-text)',
                  padding: '0.65rem 0.5rem',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase'
                }}
                onClick={() => addToCart(product)}
              >
                Quick Add
              </motion.button>
              <motion.button
                {...pressable}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(143, 146, 153, 0.3)',
                  color: 'var(--color-text)',
                  padding: '0.65rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onClick={() => setQuickViewProduct(product)}
                aria-label="Quick view product details"
                title="Quick View"
              >
                <Eye size={14} />
              </motion.button>
            </div>
          </div>
        </div>

        {/* Meta Information */}
        <div className="product-info">
          <h3
            className="product-title"
            style={{ cursor: 'pointer' }}
            onClick={() => navigateTo('product', { productId: product.id })}
          >
            {product.name}
          </h3>

          <span className="product-subtitle">{product.material}</span>

          <div className="product-price-row">
            <span className="product-price">{formattedPrice}</span>
            {formattedOriginal && (
              <span className="product-price-original">{formattedOriginal}</span>
            )}
          </div>

          {/* Available Sizes Tagging */}
          {product.availableSizes && product.availableSizes.length > 0 && (
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
              {product.availableSizes.slice(0, 3).map((sz) => (
                <span
                  key={sz}
                  style={{
                    fontSize: '0.625rem',
                    letterSpacing: '0.04em',
                    color: 'var(--color-text-muted)',
                    border: '1px solid rgba(143, 146, 153, 0.22)',
                    backgroundColor: 'rgba(7, 7, 8, 0.5)',
                    padding: '2px 6px'
                  }}
                >
                  {sz}
                </span>
              ))}
              {product.availableSizes.length > 3 && (
                <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)', alignSelf: 'center' }}>
                  +{product.availableSizes.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      </motion.article>
    </motion.div>
  );
};

export const FeaturedProducts: React.FC = () => {
  const { products, navigateTo, catalogueStatus, catalogueError, reloadCatalogue } = useShop();
  const featured = products.filter((p) => p.isFeatured).slice(0, 4);

  return (
    <section className="section-padding" style={{ backgroundColor: 'var(--color-ink)', borderBottom: '1px solid rgba(143, 146, 153, 0.2)' }} aria-labelledby="selection-heading">
      <div className="container">
        {/* Section Header */}
        <motion.div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem' }} {...revealOnScroll()}>
          <div>
            <span className="eyebrow">THE SELECTION</span>
            <h2 id="selection-heading" className="headline-editorial">
              Considered <em>Pieces.</em>
            </h2>
          </div>

          <button
            className="btn-text"
            onClick={() => navigateTo('collection', { category: 'all', gender: 'all' })}
          >
            <span>View All Pieces</span>
            <ArrowRight size={14} />
          </button>
        </motion.div>

        {catalogueStatus === 'loading' ? (
          <p style={{ color: 'var(--color-text-muted)', padding: '2rem 0' }} aria-live="polite">Loading the latest pieces…</p>
        ) : catalogueStatus === 'error' ? (
          <div style={{ color: 'var(--color-text-muted)', padding: '2rem 0' }} role="alert">
            <p>{catalogueError}</p>
            <button className="btn-text" style={{ marginTop: '0.75rem' }} onClick={() => void reloadCatalogue()}>Try Again</button>
          </div>
        ) : featured.length > 0 ? (
          <div className="product-grid">
            {featured.map((product, index) => <ProductCard key={product.id} product={product} index={index} />)}
          </div>
        ) : (
          <p style={{ color: 'var(--color-text-muted)', padding: '2rem 0' }}>New pieces will appear here when they are published.</p>
        )}
      </div>
    </section>
  );
};
