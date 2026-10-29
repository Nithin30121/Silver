import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useShop } from '../context/ShopContext';
import { AnimatedModal } from './AnimatedModal';
import { Search, X, ArrowRight } from 'lucide-react';

export const SearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, products, categories, navigateTo } = useShop();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [isSearchOpen]);

  const searchResults = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return products.filter((p) => {
      return (
        p.name.toLowerCase().includes(q) ||
        p.subtitle.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.purity.toLowerCase().includes(q)
      );
    });
  }, [query, products]);

  // Men's and women's collections can share a name (both have Rings), so each name is offered once.
  const popularSearches = useMemo(() => [...new Set(categories.flatMap((root) => root.children)
    .filter((category) => category.categoryType === 'collection')
    .map((category) => category.name))]
    .slice(0, 6), [categories]);

  return (
    <AnimatedModal
      open={isSearchOpen}
      onClose={() => setIsSearchOpen(false)}
      panelStyle={{ maxWidth: '640px', padding: '2.25rem', backgroundColor: '#0E0F11', border: '1px solid rgba(143, 146, 153, 0.35)', boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9)' }}
    >
      {/* Search Input Bar */}
      <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--color-silver-deep)', paddingBottom: '0.85rem', gap: '0.85rem' }}>
        <Search size={20} style={{ color: 'var(--color-silver-accent)' }} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search our silver catalogue (e.g. Ring, Chain, Cuff)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1,
            border: 'none',
            backgroundColor: 'transparent',
            fontSize: '1.2rem',
            fontFamily: 'var(--font-serif)',
            color: 'var(--color-text)'
          }}
        />
        {query && (
          <button onClick={() => setQuery('')} aria-label="Clear query" style={{ color: 'var(--color-text-muted)' }}>
            <X size={16} />
          </button>
        )}
        <button onClick={() => setIsSearchOpen(false)} aria-label="Close search" style={{ color: 'var(--color-text)' }}>
          <X size={20} />
        </button>
      </div>

      {/* Suggestions or Results */}
      <div style={{ marginTop: '1.75rem', maxHeight: '55vh', overflowY: 'auto' }}>
        {!query.trim() ? (
          <div>
            <span className="eyebrow" style={{ marginBottom: '0.85rem' }}>POPULAR SEARCHES</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {popularSearches.map((term) => (
                <button
                  key={term}
                  onClick={() => setQuery(term)}
                  style={{
                    padding: '0.5rem 0.95rem',
                    backgroundColor: '#121315',
                    border: '1px solid rgba(143, 146, 153, 0.25)',
                    fontSize: '0.75rem',
                    letterSpacing: '0.06em',
                    color: 'var(--color-text)',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        ) : searchResults.length > 0 ? (
          <div>
            <span className="eyebrow" style={{ marginBottom: '0.85rem' }}>
              {searchResults.length} {searchResults.length === 1 ? 'RESULT' : 'RESULTS'} FOUND
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {searchResults.map((product) => (
                <div
                  key={product.id}
                  onClick={() => {
                    setIsSearchOpen(false);
                    navigateTo('product', { productId: product.id });
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    padding: '0.75rem 1rem',
                    backgroundColor: '#121315',
                    border: '1px solid rgba(143, 146, 153, 0.18)',
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)'
                  }}
                >
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    style={{ width: '56px', height: '70px', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--color-text)' }}>{product.name}</h4>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {product.material} • <strong style={{ color: 'var(--color-silver-highlight)' }}>₹{product.price.toLocaleString('en-IN')}</strong>
                    </span>
                  </div>
                  <ArrowRight size={14} style={{ color: 'var(--color-silver-accent)' }} />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
            <span className="eyebrow">NO MATCHES</span>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted)' }}>
              We couldn't find any silver ornament matching "<strong style={{ color: 'var(--color-text)' }}>{query}</strong>".
            </p>
          </div>
        )}
      </div>
    </AnimatedModal>
  );
};
