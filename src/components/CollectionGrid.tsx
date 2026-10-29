import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useShop } from '../context/ShopContext';
import { revealOnScroll } from '../lib/motion';
import { ArrowUpRight } from 'lucide-react';

const fallbackImages = [
  '/images/category_rings.jpg',
  '/images/category_bracelets.jpg',
  '/images/category_necklaces.jpg',
  '/images/category_earrings.jpg',
];

export const CollectionGrid: React.FC = () => {
  const { categories, catalogueStatus, navigateTo } = useShop();
  const collections = useMemo(() => categories.flatMap((root) => root.children)
    .filter((category) => category.categoryType === 'collection'), [categories]);

  if (catalogueStatus === 'error' || collections.length === 0) return null;

  return (
    <section className="section-padding collection-section" aria-labelledby="collection-heading">
      <div className="container">
        <motion.div style={{ maxWidth: '680px', marginBottom: '2.5rem' }} {...revealOnScroll()}>
          <span className="eyebrow">OUR COLLECTION</span>
          <h2 id="collection-heading" className="headline-editorial">
            Silver Ornaments for <em>Every Chapter.</em>
          </h2>
          <p style={{ marginTop: '1rem', fontSize: '1.05rem', lineHeight: '1.75', color: 'var(--color-text-muted)' }}>
            Explore our thoughtfully crafted silver pieces, designed to complement your style, always.
          </p>
        </motion.div>
        <div className="category-grid">
          {collections.map((category, index) => (
            <motion.div key={category.id} className="reveal-cell" {...revealOnScroll((index % 4) * 0.08)}>
              <div className="category-card" role="button" tabIndex={0}
                onClick={() => navigateTo('collection', { category: category.id, rootCategoryId: category.parentId ?? 'all' })}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    navigateTo('collection', { category: category.id, rootCategoryId: category.parentId ?? 'all' });
                  }
                }}
                aria-label={`Browse ${category.name} collection`}>
                <div className="category-img-box">
                  <img src={category.imageUrl || fallbackImages[index % fallbackImages.length]}
                    alt={`${category.name} fine silver jewellery`} loading="lazy" width={600} height={800} />
                </div>
                <div className="category-meta">
                  <div>
                    <h3 className="category-title">{category.name}</h3>
                    <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'block', marginTop: '2px', letterSpacing: '0.04em' }}>
                      {category.description || 'Explore the collection'}
                    </span>
                  </div>
                  <span className="category-arrow" aria-hidden="true"><ArrowUpRight size={18} /></span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
