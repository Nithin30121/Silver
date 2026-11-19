import React, { useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { motion } from 'motion/react';
import { useShop } from '../context/ShopContext';
import type { Product } from '../types';
import { gentleSpring, revealOnScroll, useBumpOnIncrease } from '../lib/motion';
import { Heart, Eye, ArrowRight } from 'lucide-react';
import { PriceTag } from './PriceTag';

interface ProductCardProps {
  product: Product;
  /** Position in its grid, so cards in a row reveal one after another. */
  index?: number;
  /** False shows the card straight away, without fading it in as it scrolls into view. */
  reveal?: boolean;
}

const pressable = { whileTap: { scale: 0.95 }, transition: gentleSpring };

/** Phones: a tap anywhere on a card opens the piece (on larger screens the photo and the name do). */
const PHONE_QUERY = '(max-width: 768px)';

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

/** Whether the screen is phone-sized, kept up to date as it changes. */
function useIsPhone() {
  return useSyncExternalStore((onChange) => {
    const query = window.matchMedia(PHONE_QUERY);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, () => window.matchMedia(PHONE_QUERY).matches, () => false);
}

/** How much of the third row of cards shows below the first two, so it's clear the band scrolls. */
const NEXT_ROW_PEEK = 44;

export const FeaturedProducts: React.FC = () => {
  const { products, navigateTo, catalogueStatus, catalogueError, catalogueWaking, reloadCatalogue } = useShop();
  const isPhone = useIsPhone();
  const picked = products.filter((p) => p.isFeatured);
  // The pieces the owner picked come first; any of the four places left fill with the other pieces, A to Z as loaded.
  const firstFour = [...picked, ...products.filter((p) => !p.isFeatured)].slice(0, 4);
  // Phones list every picked piece, in a band that scrolls on its own; larger screens keep a row of four.
  const featured = isPhone && picked.length > 4 ? picked : firstFour;
  const scrolls = isPhone && featured.length > 4;
  const gridRef = useRef<HTMLDivElement>(null);
  const shownIds = featured.map((product) => product.id).join();

  // The scrolling band is as tall as two rows of cards plus a peek of the third, measured because names can wrap.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    if (!scrolls) { grid.style.removeProperty('--pieces-height'); return; }
    const fit = () => {
      const thirdRow = grid.children[4] as HTMLElement | undefined;
      if (thirdRow) grid.style.setProperty('--pieces-height', `${thirdRow.offsetTop + NEXT_ROW_PEEK}px`);
    };
    fit();
    const watcher = new ResizeObserver(fit);
    Array.from(grid.children).slice(0, 5).forEach((cell) => watcher.observe(cell));
    return () => watcher.disconnect();
  }, [scrolls, shownIds]);

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

          <button
            className="btn-text"
            onClick={() => navigateTo('collection', { category: 'all', gender: 'all' })}
          >
            <span>View All Pieces</span>
            <ArrowRight size={14} />
          </button>
        </motion.div>

        {catalogueStatus === 'loading' ? (
          <p style={{ color: 'var(--color-text-muted)', padding: '2rem 0' }} aria-live="polite">{catalogueWaking ? 'Opening the collection… The shop is waking up, which can take up to a minute.' : 'Loading the latest pieces…'}</p>
        ) : catalogueStatus === 'error' ? (
          <div style={{ color: 'var(--color-text-muted)', padding: '2rem 0' }} role="alert">
            <p>{catalogueError}</p>
            <button className="btn-text" style={{ marginTop: '0.75rem' }} onClick={() => void reloadCatalogue()}>Try Again</button>
          </div>
        ) : featured.length > 0 ? (
          <div ref={gridRef} className={`product-grid${scrolls ? ' is-scrolling' : ''}`}
            {...(scrolls && { role: 'region', 'aria-label': 'Considered pieces, scroll for more', tabIndex: 0 })}>
            {/* Pieces further down a scrolling band appear as it scrolls, so they skip the fade-in. */}
            {featured.map((product, index) => <ProductCard key={product.id} product={product} index={index} reveal={!scrolls || index < 4} />)}
          </div>
        ) : (
          <p style={{ color: 'var(--color-text-muted)', padding: '2rem 0' }}>New pieces will appear here when they are published.</p>
        )}
      </div>
    </section>
  );
};
