import React from 'react';
import { useShop } from '../context/ShopContext';
import { ArrowRight } from 'lucide-react';

export const Hero: React.FC = () => {
  const { navigateTo } = useShop();

  return (
    <section className="hero-section" aria-label="Hero Introduction">
      <div className="container">
        <div className="hero-grid">
          {/* Left: Editorial Content */}
          <div className="hero-copy">
            <span className="eyebrow">SILVER ORNAMENTS</span>
            
            <h1 className="hero-headline">
              Timeless<br />
              in Every <em>Detail.</em>
            </h1>

            <p className="hero-supporting">
              Distinctive silver ornaments, crafted for moments that stay with you.
            </p>

            <button
              className="btn-primary"
              onClick={() => navigateTo('collection', { category: 'all', gender: 'all' })}
              aria-label="Explore silver jewellery collection"
            >
              <span>EXPLORE COLLECTION</span>
              <ArrowRight size={15} style={{ strokeWidth: 1.8 }} />
            </button>
          </div>

          {/* Right: Substantial Luxury Product Photograph */}
          <div className="hero-visual">
            <div className="hero-image-frame">
              <img
                src="/images/hero_silver_ring.jpg"
                alt="Intricately crafted 925 sterling silver ring resting on natural beige stone"
                loading="eager"
                fetchPriority="high"
                width={800}
                height={600}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tiny Vertical Scroll Indicator */}
      <div className="hero-scroll-indicator" aria-hidden="true">
        <span>SCROLL</span>
        <div className="scroll-line" />
      </div>
    </section>
  );
};
