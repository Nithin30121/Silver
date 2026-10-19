import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useShop } from '../context/ShopContext';
import { Search, X, ArrowRight } from 'lucide-react';

export const SearchModal: React.FC = () => {
  const { isSearchOpen, setIsSearchOpen, products, navigateTo } = useShop();
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

  const popularSearches = ['925 Silver Rings', 'Cuban Chain', 'Signet Ring', 'Earrings', 'Hammered Pendant', 'Solid Cuff'];

  if (!isSearchOpen) return null;

  return (
    <div className={`modal-backdrop open`} onClick={() => setIsSearchOpen(false)}>
      <div
        className="modal-panel"
        style={{ maxWidth: '640px', padding: '2rem' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '2px solid var(--color-deep-charcoal)', paddingBottom: '0.75rem', gap: '0.75rem' }}>
          <Search size={20} style={{ color: 'var(--color-champagne)' }} />
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
              fontSize: '1.15rem',
              fontFamily: 'var(--font-serif)',
              color: 'var(--color-deep-charcoal)'
            }}
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Clear query">
              <X size={16} />
            </button>
          )}
          <button onClick={() => setIsSearchOpen(false)} aria-label="Close search">
            <X size={20} />
          </button>
        </div>

        {/* Suggestions or Results */}
        <div style={{ marginTop: '1.5rem', maxHeight: '55vh', overflowY: 'auto' }}>
          {!query.trim() ? (
            <div>
              <span className="eyebrow" style={{ marginBottom: '0.75rem' }}>POPULAR SEARCHES</span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {popularSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => setQuery(term.replace('925 ', ''))}
                    style={{
                      padding: '0.45rem 0.85rem',
                      backgroundColor: 'var(--color-soft-cream)',
                      border: '1px solid var(--color-border)',
                      fontSize: '0.75rem',
                      letterSpacing: '0.04em',
                      color: 'var(--color-deep-charcoal)'
                    }}
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : searchResults.length > 0 ? (
            <div>
              <span className="eyebrow" style={{ marginBottom: '0.75rem' }}>
                {searchResults.length} {searchResults.length === 1 ? 'RESULT' : 'RESULTS'} FOUND
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                      padding: '0.65rem',
                      backgroundColor: 'var(--color-soft-cream)',
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
                      <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem' }}>{product.name}</h4>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-grey)' }}>
                        {product.material} • ₹{product.price.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <ArrowRight size={14} style={{ color: 'var(--color-champagne)' }} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <span className="eyebrow">NO MATCHES</span>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-muted-grey)' }}>
                We couldn't find any silver ornament matching "<strong>{query}</strong>".
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
