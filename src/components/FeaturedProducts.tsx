import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useShop } from '../context/ShopContext';
import type { Product } from '../types';
import { gentleSpring, revealOnScroll, useBumpOnIncrease } from '../lib/motion';
import { Heart, Eye, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { PriceTag } from './PriceTag';
import { PHONE_QUERY, useIsPhone } from '../lib/useIsPhone';

interface ProductCardProps {
  product: Product;
  /** Position in its grid, so cards in a row reveal one after another. */
  index?: number;
  /** False shows the card straight away, without fading it in as it scrolls into view. */
  reveal?: boolean;
}

const pressable = { whileTap: { scale: 0.95 }, transition: gentleSpring };

/** Phones: a tap anywhere on a card opens the piece (on larger screens the photo and the name do). */
export const ProductCard: React.FC<ProductCardProps> = ({ product, index = 0, reveal = true }) => {
  const { navigateTo, isWishlisted, toggleWishlist, addToCart, setQuickViewProduct } = useShop();
  const wishlisted = isWishlisted(product.id);
  const heartRef = useBumpOnIncrease<HTMLSpanElement>(wishlisted ? 1 : 0);
  const soldOut = product.stockQuantity <= 0;
  const openProduct = () => navigateTo('product', { productId: product.id });
  // A short line under the name: the piece's own description where it has one, else its material.
  const shortLine = product.description?.trim() || product.material;

  return (
    <motion.div className="reveal-cell" {...(reveal && revealOnScroll((index % 4) * 0.08))}>
      <motion.article className={`product-card ${soldOut ? 'is-sold-out' : ''}`} aria-label={soldOut ? `${product.name}, out of stock` : product.name}
        whileHover={{ y: -6 }} transition={gentleSpring}
        onClick={() => { if (window.matchMedia(PHONE_QUERY).matches) openProduct(); }}>
        <div className="product-img-wrapper">
          {/* Badges: an out-of-stock piece says so instead of NEW. */}
          {soldOut ? <span className="product-badge-tag is-sold-out">Out of stock</span>
            : product.isNew && <span className="product-badge-tag">NEW</span>}

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
            onClick={(event) => { event.stopPropagation(); openProduct(); }}
          >
            <img
              src={product.images[0]}
              alt={product.name}
              className={`product-img-primary${product.images[1] ? ' has-alternate' : ''}`}
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

          {/* Quick Actions Hover Drawer (larger screens only; phones open the piece instead) */}
          <div className="product-quick-add" onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
              <motion.button
                {...pressable}
                style={{
                  flex: 1,
                  background: 'rgba(var(--rgb-panel), 0.95)',
                  border: '1px solid var(--color-silver-deep)',
                  color: 'var(--color-text)',
                  padding: '0.65rem 0.5rem',
                  fontSize: '0.6875rem',
                  fontWeight: 600,
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase'
                }}
                onClick={() => addToCart(product)}
                disabled={soldOut}
                aria-disabled={soldOut}
              >
                {soldOut ? 'Out of stock' : 'Quick Add'}
              </motion.button>
              <motion.button
                {...pressable}
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(var(--rgb-line), 0.3)',
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
            onClick={(event) => { event.stopPropagation(); openProduct(); }}
          >
            {product.name}
          </h3>

          <span className="product-subtitle">{product.material}</span>
          {/* Phones show this one line instead of the material line above. */}
          <span className="product-short-line">{shortLine}</span>

          <div className="product-price-row">
            <PriceTag price={product.price} originalPrice={product.originalPrice} />
          </div>
          {soldOut && <span className="stock-note is-out">Out of stock</span>}

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
                    border: '1px solid rgba(var(--rgb-line), 0.22)',
                    backgroundColor: 'rgba(var(--rgb-base), 0.5)',
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

/** Picked pieces by their number, 1 first; a piece without one goes after them. Equal numbers keep A to Z. */
const byFeaturedPosition = (a: Product, b: Product) =>
  (a.featuredPosition ?? Number.MAX_SAFE_INTEGER) - (b.featuredPosition ?? Number.MAX_SAFE_INTEGER);

export const FeaturedProducts: React.FC = () => {
  const { products, navigateTo, catalogueStatus, catalogueError, catalogueWaking, reloadCatalogue } = useShop();
  const isPhone = useIsPhone();
  // The pieces the owner picked come first, in the order of their numbers, then every other piece, A to Z as loaded.
  const ordered = [...products.filter((p) => p.isFeatured).sort(byFeaturedPosition), ...products.filter((p) => !p.isFeatured)];
  // Every piece sits in one row that scrolls sideways, so ticking one never pushes another out. Phones show two at a
  // time and are swiped; larger screens show four (three on smaller ones), with arrows as well as trackpad swipes.
  const featured = ordered;
  const shown = isPhone ? 2 : 3;
  const swipes = featured.length > shown;

  // Whether the row is at its start or its end, which hides the matching arrow; at both, nothing is hidden and the
  // arrows go away. The resize observer reports once as soon as it starts watching, which fills this in.
  const rowRef = useRef<HTMLDivElement>(null);
  const [rowEdges, setRowEdges] = useState({ atStart: true, atEnd: true });
  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    const measure = () => setRowEdges({
      atStart: row.scrollLeft <= 2,
      atEnd: row.scrollLeft + row.clientWidth >= row.scrollWidth - 2,
    });
    row.addEventListener('scroll', measure, { passive: true });
    const observer = new ResizeObserver(measure);
    observer.observe(row);
    return () => { row.removeEventListener('scroll', measure); observer.disconnect(); };
  }, [swipes, catalogueStatus]);
  const scrollRow = (direction: 1 | -1) => {
    const row = rowRef.current;
    if (!row) return;
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    row.scrollBy({ left: direction * row.clientWidth, behavior: calm ? 'auto' : 'smooth' });
  };
  const showArrows = !isPhone && swipes && !(rowEdges.atStart && rowEdges.atEnd);
  const viewAll = (where: 'head' | 'foot') => (
    <button
      className={`btn-text featured-view-all is-${where}`}
      onClick={() => navigateTo('collection', { category: 'all', gender: 'all' })}
    >
      <span>View All Pieces</span>
      <ArrowRight size={14} />
    </button>
  );

  return (
    <section className="section-padding featured-section" aria-labelledby="selection-heading">
      <div className="container">
        {/* Section Header */}
        <motion.div className="featured-head" {...revealOnScroll()}>
          <div>
            <span className="eyebrow">THE SELECTION</span>
            <h2 id="selection-heading" className="headline-editorial">
              Considered <em>Pieces.</em>
            </h2>
          </div>

          {/* Phones keep this link under the heading; larger screens show it centred below the row instead. */}
          {viewAll('head')}
        </motion.div>

        {catalogueStatus === 'loading' ? (
          <p style={{ color: 'var(--color-text-muted)', padding: '2rem 0' }} aria-live="polite">{catalogueWaking ? 'Opening the collection… The shop is waking up, which can take up to a minute.' : 'Loading the latest pieces…'}</p>
        ) : catalogueStatus === 'error' ? (
          <div style={{ color: 'var(--color-text-muted)', padding: '2rem 0' }} role="alert">
            <p>{catalogueError}</p>
            <button className="btn-text" style={{ marginTop: '0.75rem' }} onClick={() => void reloadCatalogue()}>Try Again</button>
          </div>
        ) : featured.length > 0 ? (
          <>
            <div className="featured-row">
              <div ref={rowRef} className={`product-grid${swipes ? ' is-swiping' : ''}`}
                {...(swipes && { role: 'region', 'aria-label': 'Considered pieces, scroll sideways for more', tabIndex: 0 })}>
                {/* Pieces further along the row appear as it scrolls, so they skip the fade-in. */}
                {featured.map((product, index) => <ProductCard key={product.id} product={product} index={index} reveal={!swipes || index < (isPhone ? 2 : 4)} />)}
              </div>

              {/* Larger screens: square arrows on the row's edges; each hides at its end of the row. */}
              {showArrows && (
                <>
                  <button type="button" className="featured-arrow is-prev" onClick={() => scrollRow(-1)} disabled={rowEdges.atStart}
                    aria-label="Previous pieces">
                    <ChevronLeft size={22} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                  <button type="button" className="featured-arrow is-next" onClick={() => scrollRow(1)} disabled={rowEdges.atEnd}
                    aria-label="More pieces">
                    <ChevronRight size={22} strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </>
              )}
            </div>
            <div className="featured-foot">{viewAll('foot')}</div>
          </>
        ) : (
          <p style={{ color: 'var(--color-text-muted)', padding: '2rem 0' }}>New pieces will appear here when they are published.</p>
        )}
      </div>
    </section>
  );
};
