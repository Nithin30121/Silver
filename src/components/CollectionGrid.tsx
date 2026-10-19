import React from 'react';
import { useShop } from '../context/ShopContext';
import { CATEGORIES } from '../data/products';
import type { ProductCategory } from '../types';
import { ArrowUpRight } from 'lucide-react';

export const CollectionGrid: React.FC = () => {
  const { navigateTo } = useShop();

  return (
    <section className="section-padding" style={{ backgroundColor: 'var(--color-warm-ivory)' }} aria-labelledby="collection-heading">
      <div className="container">
        {/* Section Header */}
        <div style={{ maxWidth: '640px', marginBottom: '2.5rem' }}>
          <span className="eyebrow">OUR COLLECTION</span>
          <h2 id="collection-heading" className="headline-editorial">
            Silver Ornaments for <em>Every Chapter.</em>
          </h2>
          <p style={{ marginTop: '1rem', fontSize: '1rem', lineHeight: '1.7', color: 'var(--color-muted-grey)' }}>
            Explore our thoughtfully crafted silver pieces, designed to complement your style, always.
          </p>
        </div>

        {/* 4-Category Single Row Grid */}
        <div className="category-grid">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.id}
              className="category-card"
              role="button"
              tabIndex={0}
              onClick={() => navigateTo('collection', { category: cat.id as ProductCategory, gender: 'all' })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigateTo('collection', { category: cat.id as ProductCategory, gender: 'all' });
                }
              }}
              aria-label={`Browse ${cat.name} collection`}
            >
              <div className="category-img-box">
                <img
                  src={cat.image}
                  alt={`${cat.name} silver jewellery`}
                  loading="lazy"
                  width={600}
                  height={800}
                />
              </div>

              <div className="category-meta">
                <div>
                  <h3 className="category-title">{cat.name}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--color-muted-grey)', display: 'block', marginTop: '2px' }}>
                    {cat.tagline}
                  </span>
                </div>
                <span className="category-arrow" aria-hidden="true">
                  <ArrowUpRight size={18} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
