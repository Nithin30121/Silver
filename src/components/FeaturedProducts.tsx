import React from 'react';
import { useShop } from '../context/ShopContext';
import type { Product } from '../types';
import { Heart, Eye, ArrowRight } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { navigateTo, isWishlisted, toggleWishlist, addToCart, setQuickViewProduct } = useShop();
  const wishlisted = isWishlisted(product.id);

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
    <article className="product-card" aria-label={product.name}>
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
          <Heart
            size={16}
            style={{
              fill: wishlisted ? 'var(--color-rose-gold)' : 'none',
              stroke: wishlisted ? 'var(--color-rose-gold)' : 'currentColor',
              strokeWidth: 1.8
            }}
          />
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
            <button
              style={{
                flex: 1,
                background: 'rgba(27, 23, 20, 0.95)',
                border: '1px solid var(--color-metallic-copper)',
                color: 'var(--color-soft-ivory)',
                padding: '0.65rem 0.5rem',
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.14em',
                textTransform: 'uppercase',
                transition: 'all 0.2s ease'
              }}
              onClick={() => addToCart(product)}
            >
              Quick Add
            </button>
            <button
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(184, 121, 81, 0.3)',
                color: 'var(--color-soft-ivory)',
                padding: '0.65rem 0.75rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease'
              }}
              onClick={() => setQuickViewProduct(product)}
              aria-label="Quick view product details"
              title="Quick View"
            >
              <Eye size={14} />
            </button>
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
                  color: 'var(--color-muted-grey)',
                  border: '1px solid rgba(184, 121, 81, 0.22)',
                  backgroundColor: 'rgba(8, 7, 6, 0.5)',
                  padding: '2px 6px'
                }}
              >
                {sz}
              </span>
            ))}
            {product.availableSizes.length > 3 && (
              <span style={{ fontSize: '0.625rem', color: 'var(--color-muted-grey)', alignSelf: 'center' }}>
                +{product.availableSizes.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export const FeaturedProducts: React.FC = () => {
  const { products, navigateTo } = useShop();
  const featured = products.filter((p) => p.isFeatured).slice(0, 4);

  return (
    <section className="section-padding" style={{ backgroundColor: 'var(--color-rich-black)', borderBottom: '1px solid rgba(184, 121, 81, 0.2)' }} aria-labelledby="selection-heading">
      <div className="container">
        {/* Section Header */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.5rem' }}>
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
        </div>

        {/* 4-Column Product Grid */}
        <div className="product-grid">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};
