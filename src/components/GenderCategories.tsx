import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useShop } from '../context/ShopContext';
import { revealOnScroll } from '../lib/motion';

// Close-ups of the rings from the Men and Women campaign photos, cut to the card's tall shape.
const fallbackImages = ['/images/men_ring_card.webp', '/images/women_ring_card.webp'];

/** Collections the shop is preparing. They are shown, not linked, until their products are in the catalogue. */
const comingSoon = [
  { key: 'puja', title: ['Pure Silver', 'Puja Essentials'], line: '“Devotion in Silver.”', tone: 'is-quote',
    image: '/images/coming_puja_essentials.webp', alt: 'Engraved pure silver puja bowl with an Om motif beside white flowers' },
  { key: 'rose', title: ['Rose Aura :', 'Fine 18K Jewellery'], line: 'Rose Gold 18K & 14K Carat Jewellery.', tone: 'is-note',
    image: '/images/coming_rose_aura.webp', alt: 'Rose gold flower pendant on a fine chain resting on black satin' },
];

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
                <img src={root.imageUrl || fallbackImages[index % fallbackImages.length]} alt={`${root.name} fine 925 sterling silver collection`} loading="lazy" width={556} height={806} />
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
          {comingSoon.map((card, index) => (
            <motion.div key={card.key} className="reveal-cell" {...revealOnScroll((roots.length + index) * 0.12)}>
              <article className="gender-panel is-coming-soon" aria-label={`${card.title.join(' ')}, coming soon`}>
                <span className="gender-soon-label">COMING SOON</span>
                <div className="gender-soon-media">
                  <img src={card.image} alt={card.alt} loading="lazy" width={442} height={350} />
                </div>
                <div className="gender-soon-info">
                  <h3 className="gender-soon-title">{card.title[0]}<br />{card.title[1]}</h3>
                  <p className={`gender-soon-line ${card.tone}`}>{card.line}</p>
                </div>
              </article>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
