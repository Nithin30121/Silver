import React from 'react';
import { useShop } from '../context/ShopContext';

export const GenderCategories: React.FC = () => {
  const { navigateTo } = useShop();

  const handleNavigateMen = () => {
    navigateTo('men', { gender: 'men', category: 'all' });
  };

  const handleNavigateWomen = () => {
    navigateTo('women', { gender: 'women', category: 'all' });
  };

  return (
    <section className="gender-categories-section" aria-labelledby="gender-categories-heading">
      <div className="container">
        {/* Section Header */}
        <div className="gender-categories-header">
          <span className="eyebrow">DISCOVER YOUR STYLE</span>
          <h2 id="gender-categories-heading" className="headline-editorial">
            Jewellery, <em>Defined by You.</em>
          </h2>
          <p className="gender-categories-intro">
            Distinctive silver ornaments for every expression of style.
          </p>
        </div>

        {/* Two-Column Luxury Campaign Panels */}
        <div className="gender-panels-grid">
          {/* Left Panel: MEN'S WEAR */}
          <article
            className="gender-panel"
            role="button"
            tabIndex={0}
            onClick={handleNavigateMen}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleNavigateMen();
              }
            }}
            aria-label="Explore Men's Wear fine silver collection: Rings and Bracelets"
          >
            <div className="gender-panel-media">
              <img
                src="/images/campaign_mens_wear.jpg"
                alt="Men's fine 925 sterling silver signet ring and diamond-cut Cuban chain bracelet arranged on dark textured slate stone"
                loading="lazy"
                width={800}
                height={1067}
              />
              <div className="gender-panel-scrim" aria-hidden="true" />
            </div>

            <div className="gender-panel-overlay">
              <div className="gender-panel-info">
                <span className="gender-panel-eyebrow">CURATED COLLECTION</span>
                <h3 className="gender-panel-title">MEN'S WEAR</h3>
                <p className="gender-panel-subtitle">Bold forms. Timeless character.</p>
              </div>

              <div className="gender-panel-cta" aria-hidden="true">
                <span className="gender-panel-cta-label">EXPLORE MEN'S COLLECTION</span>
                <span className="gender-panel-cta-arrow">→</span>
              </div>
            </div>
          </article>

          {/* Right Panel: WOMEN'S WEAR */}
          <article
            className="gender-panel"
            role="button"
            tabIndex={0}
            onClick={handleNavigateWomen}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleNavigateWomen();
              }
            }}
            aria-label="Explore Women's Wear fine silver collection: Rings, Bracelets, Necklaces, and Earrings"
          >
            <div className="gender-panel-media">
              <img
                src="/images/campaign_womens_wear.jpg"
                alt="Women's fine 925 sterling silver wave ring, tennis bracelet, and medallion pendant necklace arranged on dark slate stone"
                loading="lazy"
                width={800}
                height={1067}
              />
              <div className="gender-panel-scrim" aria-hidden="true" />
            </div>

            <div className="gender-panel-overlay">
              <div className="gender-panel-info">
                <span className="gender-panel-eyebrow">CURATED COLLECTION</span>
                <h3 className="gender-panel-title">WOMEN'S WEAR</h3>
                <p className="gender-panel-subtitle">Elegance in every detail.</p>
              </div>

              <div className="gender-panel-cta" aria-hidden="true">
                <span className="gender-panel-cta-label">EXPLORE WOMEN'S COLLECTION</span>
                <span className="gender-panel-cta-arrow">→</span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
};
