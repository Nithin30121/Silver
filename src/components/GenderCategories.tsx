import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useShop } from '../context/ShopContext';
import { revealOnScroll } from '../lib/motion';

const fallbackImages = ['/images/campaign_mens_wear.jpg', '/images/campaign_womens_wear.jpg'];

export const GenderCategories: React.FC = () => {
  const { categories, catalogueStatus, navigateTo } = useShop();
  const roots = useMemo(() => {
    const audiences = categories.filter((category) => category.categoryType === 'audience');
    return (audiences.length > 0 ? audiences : categories).slice(0, 2);
  }, [categories]);

  if (catalogueStatus === 'error' || roots.length === 0) return null;

  return (
    <section className="gender-categories-section" aria-labelledby="gender-categories-heading">
      <div className="container">
        <motion.div className="gender-categories-header" {...revealOnScroll()}>
          <span className="eyebrow">DISCOVER YOUR STYLE</span>
          <h2 id="gender-categories-heading" className="headline-editorial">Jewellery, <em>Defined by You.</em></h2>
          <p className="gender-categories-intro">Distinctive silver ornaments for every expression of style.</p>
        </motion.div>
        <div className="gender-panels-grid">
          {roots.map((root, index) => {
            const browse = () => navigateTo('collection', { rootCategoryId: root.id, category: 'all' });
            return <motion.div key={root.id} className="reveal-cell" {...revealOnScroll(index * 0.12)}><article className="gender-panel" role="button" tabIndex={0} onClick={browse}
              onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); browse(); } }}
              aria-label={`Explore ${root.name} fine silver collection`}>
              <div className="gender-panel-media">
                <img src={root.imageUrl || fallbackImages[index % fallbackImages.length]} alt={`${root.name} fine 925 sterling silver collection`} loading="lazy" width={800} height={1067} />
                <div className="gender-panel-scrim" aria-hidden="true" />
              </div>
              <div className="gender-panel-overlay">
                <div className="gender-panel-info">
                  <span className="gender-panel-eyebrow">CURATED COLLECTION</span>
                  <h3 className="gender-panel-title">{root.name}</h3>
                  <p className="gender-panel-subtitle">{root.description || 'Distinctive pieces for every expression.'}</p>
                </div>
                <div className="gender-panel-cta" aria-hidden="true"><span className="gender-panel-cta-label">EXPLORE {root.name.toUpperCase()}</span><span className="gender-panel-cta-arrow">→</span></div>
              </div>
            </article></motion.div>;
          })}
        </div>
      </div>
    </section>
  );
};
