import React, { useState, useMemo } from 'react';
import { useShop } from '../context/ShopContext';
import { ProductCard } from './FeaturedProducts';
import type { CatalogueCategory, ProductCategory } from '../types';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';

function categoryIds(category: CatalogueCategory): string[] {
  return [category.id, ...category.children.flatMap(categoryIds)];
}

export const CatalogPage: React.FC = () => {
  const { products, categories, selectedCategory, selectedRootCategoryId, catalogueStatus, catalogueError, reloadCatalogue } = useShop();

  const [activeCategory, setActiveCategory] = useState<ProductCategory | 'all'>(selectedCategory || 'all');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc' | 'name'>('featured');
  const [maxPrice, setMaxPrice] = useState<number>(20000);
  const [inStockOnly, setInStockOnly] = useState<boolean>(false);
  const [showFiltersMobile, setShowFiltersMobile] = useState<boolean>(false);

  // Sync category if updated externally
  React.useEffect(() => {
    if (selectedCategory) {
      setActiveCategory(selectedCategory);
    }
  }, [selectedCategory]);

  const rootCategory = useMemo(() => categories.find((category) => category.id === selectedRootCategoryId), [categories, selectedRootCategoryId]);

  // Categories come directly from the database tree, not a fixed frontend list.
  const availableSubcategories: { id: ProductCategory | 'all'; label: string }[] = useMemo(() => {
    const directCollections = rootCategory ? rootCategory.children : categories.flatMap((category) => category.children);
    return [
      { id: 'all', label: rootCategory ? `All ${rootCategory.name}` : 'All Pieces' },
      ...directCollections.filter((category) => category.categoryType === 'collection')
        .map((category) => ({ id: category.id, label: category.name })),
    ];
  }, [categories, rootCategory]);

  const scopedCategoryIds = useMemo(() => rootCategory ? new Set(categoryIds(rootCategory)) : null, [rootCategory]);

  // Filter and sort products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (scopedCategoryIds && !p.categoryIds.some((id) => scopedCategoryIds.has(id))) return false;
      if (activeCategory !== 'all' && !p.categoryIds.includes(activeCategory)) {
        return false;
      }

      // Price filter
      if (p.price > maxPrice) return false;

      // In stock filter
      if (inStockOnly && !p.inStock) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0);
    });
  }, [products, scopedCategoryIds, activeCategory, maxPrice, inStockOnly, sortBy]);

  const pageTitle = rootCategory ? `${rootCategory.name} Collection` : 'The Collection';
  const pageDescription = rootCategory?.description || 'Our complete archive of certified 925 hallmarked sterling silver ornaments, crafted for longevity.';

  const resetFilters = () => {
    setActiveCategory('all');
    setMaxPrice(20000);
    setInStockOnly(false);
    setSortBy('featured');
  };

  return (
    <div style={{ backgroundColor: 'var(--color-obsidian-black)', minHeight: '80vh', paddingBottom: '6rem' }}>
      {/* Editorial Header */}
      <div style={{ backgroundColor: '#0d0a09', borderBottom: '1px solid rgba(184, 121, 81, 0.22)', padding: '5rem 0 3.5rem' }}>
        <div className="container" style={{ maxWidth: '800px', textAlign: 'center' }}>
          <span className="eyebrow">SILVORA ATELIER</span>
          <h1 className="headline-editorial" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', marginBottom: '1.25rem', color: 'var(--color-soft-ivory)' }}>
            {pageTitle}
          </h1>
          <p style={{ fontSize: '1.0625rem', color: 'var(--color-muted-grey)', lineHeight: '1.75' }}>
            {pageDescription}
          </p>

          {/* Subcategory Pills */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: '2.5rem' }}>
            {availableSubcategories.map((sub) => (
              <button
                key={sub.id}
                onClick={() => setActiveCategory(sub.id)}
                style={{
                  padding: '0.65rem 1.45rem',
                  fontSize: '0.75rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase',
                  fontWeight: 500,
                  border: activeCategory === sub.id ? '1px solid var(--color-metallic-copper)' : '1px solid rgba(184, 121, 81, 0.25)',
                  backgroundColor: activeCategory === sub.id ? 'rgba(27, 23, 20, 0.95)' : 'rgba(16, 13, 11, 0.6)',
                  color: activeCategory === sub.id ? 'var(--color-champagne)' : 'var(--color-muted-grey)',
                  boxShadow: activeCategory === sub.id ? '0 0 15px rgba(184, 121, 81, 0.2)' : 'none',
                  transition: 'var(--transition-fast)'
                }}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="container" style={{ marginTop: '2.5rem' }}>
        {/* Controls Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.25rem',
            paddingBottom: '1.5rem',
            borderBottom: '1px solid rgba(184, 121, 81, 0.2)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--color-muted-grey)', letterSpacing: '0.04em' }}>
              Showing <strong style={{ color: 'var(--color-soft-ivory)' }}>{filteredProducts.length}</strong> {filteredProducts.length === 1 ? 'piece' : 'pieces'}
            </span>

            {/* Quick Filter toggle for mobile */}
            <button
              className="btn-text"
              onClick={() => setShowFiltersMobile(!showFiltersMobile)}
              style={{ fontSize: '0.75rem' }}
            >
              <SlidersHorizontal size={14} />
              <span>{showFiltersMobile ? 'Hide Filters' : 'Refine & Filter'}</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <label htmlFor="sort-select" style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-muted-grey)' }}>
              Sort by:
            </label>
            <select
              id="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{
                backgroundColor: '#100D0B',
                border: '1px solid rgba(184, 121, 81, 0.3)',
                padding: '0.55rem 1.25rem',
                fontSize: '0.8125rem',
                color: 'var(--color-soft-ivory)',
                cursor: 'pointer'
              }}
            >
              <option value="featured">Featured Archive</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="name">Alphabetical</option>
            </select>
          </div>
        </div>

        {/* Expandable Filter Tray */}
        {showFiltersMobile && (
          <div
            style={{
              padding: '1.75rem',
              backgroundColor: '#100D0B',
              border: '1px solid rgba(184, 121, 81, 0.25)',
              borderTop: 'none',
              display: 'flex',
              flexWrap: 'wrap',
              gap: '2.5rem',
              alignItems: 'center',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            {/* Price Slider */}
            <div style={{ minWidth: '220px' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-soft-ivory)' }}>
                Max Price: ₹{maxPrice.toLocaleString('en-IN')}
              </label>
              <input
                type="range"
                min="4000"
                max="20000"
                step="500"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--color-metallic-copper)', cursor: 'pointer' }}
              />
            </div>

            {/* In Stock Only Checkbox */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8125rem', cursor: 'pointer', color: 'var(--color-soft-ivory)' }}>
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                style={{ accentColor: 'var(--color-metallic-copper)' }}
              />
              <span>In-stock pieces only</span>
            </label>

            {/* Reset Filters */}
            <button
              onClick={resetFilters}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.75rem',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--color-rose-gold)'
              }}
            >
              <RotateCcw size={13} />
              <span>Reset All Filters</span>
            </button>
          </div>
        )}

        {/* Product Grid, loading/error states, or empty state */}
        {catalogueStatus === 'loading' ? (
          <div style={{ textAlign: 'center', padding: '6rem 2rem', color: 'var(--color-muted-grey)' }} aria-live="polite">
            Loading the latest collection…
          </div>
        ) : catalogueStatus === 'error' ? (
          <div style={{ textAlign: 'center', padding: '6rem 2rem' }} role="alert">
            <span className="eyebrow">CATALOGUE UNAVAILABLE</span>
            <p style={{ maxWidth: '420px', margin: '1rem auto 2rem', color: 'var(--color-muted-grey)' }}>{catalogueError}</p>
            <button className="btn-secondary" onClick={() => void reloadCatalogue()}>Try Again</button>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '6rem 2rem' }}>
            <span className="eyebrow">NO MATCHES FOUND</span>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '1rem', color: 'var(--color-soft-ivory)' }}>
              No pieces match your selected criteria.
            </h3>
            <p style={{ maxWidth: '420px', margin: '0 auto 2rem', color: 'var(--color-muted-grey)' }}>
              Try adjusting your price range or browsing all categories to discover our full silver collection.
            </p>
            <button className="btn-secondary" onClick={resetFilters}>
              Clear All Filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
