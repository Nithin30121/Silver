import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { useShop } from '../context/ShopContext';
import { revealOnScroll } from '../lib/motion';

// Men: an engraved signet ring beside a curb chain. Women: a marquise-flower ring beside a tennis bracelet. Both are shot
// in the card's tall shape, with room at the bottom for the words.
const fallbackImages = ['/images/style_men_signet', '/images/style_women_flower_ring'];

/** Every card photo comes full size (1043px wide) and at 640px for phones and narrow cards. */
const cardPhoto = (base: string) => ({
  src: `${base}.webp`,
  srcSet: `${base}_640.webp 640w, ${base}.webp 1043w`,
  sizes: '(max-width: 600px) 92vw, (max-width: 1100px) 46vw, 23vw',
});

/** Collections the shop is preparing. They are shown, not linked, until their products are in the catalogue. */
const comingSoon = [
  { key: 'puja', title: ['Pure Silver', 'Puja Essentials'], line: '“Devotion in Silver.”', tone: 'is-quote',
    image: '/images/coming_puja_bowl', alt: 'A pure silver puja bowl engraved with flowers around an Om medallion, on a footed base' },
  { key: 'rose', title: ['Rose Aura :', 'Fine 18K Jewellery'], line: 'Rose Gold 18K & 14K Carat Jewellery.', tone: 'is-note',
    image: '/images/coming_rose_aura_pendant', alt: 'A rose gold flower pendant set with clear stones, on a fine chain over white satin' },
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
      <div className="container gender-categories-container">
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
                {root.imageUrl
                  ? <img src={root.imageUrl} alt={`${root.name} fine 925 sterling silver collection`} loading="lazy" width={1043} height={1508} />
                  : <img {...cardPhoto(fallbackImages[index % fallbackImages.length])} alt={`${root.name} fine 925 sterling silver collection`} loading="lazy" width={1043} height={1508} />}
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
                {/* The photo fills the card; the label sits in its open top and the words in its open bottom. */}
                <div className="gender-soon-media">
                  <img {...cardPhoto(card.image)} alt={card.alt} loading="lazy" width={1043} height={1508} />
                </div>
                <span className="gender-soon-label">COMING SOON</span>
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
