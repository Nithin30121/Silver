import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useShop } from '../context/ShopContext';
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

  const popularSearches = useMemo(() => categories.flatMap((root) => root.children)
    .filter((category) => category.categoryType === 'collection')
    .map((category) => category.name)
    .slice(0, 6), [categories]);

  if (!isSearchOpen) return null;

  return (
    <div className={`modal-backdrop open`} onClick={() => setIsSearchOpen(false)}>
      <div
        className="modal-panel"
        style={{ maxWidth: '640px', padding: '2.25rem', backgroundColor: '#100D0B', border: '1px solid rgba(184, 121, 81, 0.35)', boxShadow: '0 24px 60px rgba(0, 0, 0, 0.9)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid var(--color-metallic-copper)', paddingBottom: '0.85rem', gap: '0.85rem' }}>
          <Search size={20} style={{ color: 'var(--color-rose-gold)' }} />
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
              color: 'var(--color-soft-ivory)'
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear query" style={{ color: 'var(--color-muted-grey)' }}>
              <X size={16} />
            </button>
          )}
          <button onClick={() => setIsSearchOpen(false)} aria-label="Close search" style={{ color: 'var(--color-soft-ivory)' }}>
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
                      backgroundColor: '#14100E',
                      border: '1px solid rgba(184, 121, 81, 0.25)',
                      fontSize: '0.75rem',
                      letterSpacing: '0.06em',
                      color: 'var(--color-soft-ivory)',
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
                      backgroundColor: '#14100E',
                      border: '1px solid rgba(184, 121, 81, 0.18)',
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
                      <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'var(--color-soft-ivory)' }}>{product.name}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-grey)' }}>
                        {product.material} • <strong style={{ color: 'var(--color-champagne)' }}>₹{product.price.toLocaleString('en-IN')}</strong>
                      </span>
                    </div>
                    <ArrowRight size={14} style={{ color: 'var(--color-rose-gold)' }} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <span className="eyebrow">NO MATCHES</span>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-muted-grey)' }}>
                We couldn't find any silver ornament matching "<strong style={{ color: 'var(--color-soft-ivory)' }}>{query}</strong>".
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
