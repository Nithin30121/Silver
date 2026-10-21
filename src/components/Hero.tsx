import React from 'react';
import { useShop } from '../context/ShopContext';
import { ArrowRight } from 'lucide-react';

export const Hero: React.FC = () => {
  const { navigateTo } = useShop();

  return (
    <section className="hero-section" aria-label="Hero Introduction">
      {/* Restrained flowing metallic curve accents near edges */}
      <svg
        className="hero-ambient-curves"
        viewBox="0 0 1440 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M-100,50 C300,120 700,20 1100,180 C1300,260 1480,200 1600,280"
          stroke="url(#copperGrad1)"
          strokeWidth="1.2"
          strokeOpacity="0.35"
        />
        <path
          d="M-50,750 C400,680 800,780 1250,620 C1400,560 1520,600 1650,540"
          stroke="url(#copperGrad2)"
          strokeWidth="1"
          strokeOpacity="0.25"
        />
        <defs>
          <linearGradient id="copperGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B87951" stopOpacity="0" />
            <stop offset="30%" stopColor="#D6A080" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#B87951" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#D6A080" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="copperGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D6A080" stopOpacity="0" />
            <stop offset="50%" stopColor="#B87951" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#E8C4A4" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Full-bleed SILVESTO LUXE artwork behind the editorial hero copy */}
      <div className="hero-fullscreen-visual" aria-hidden="true">
        <img
          src="/images/hero_silvesto_luxe.png"
          alt=""
          loading="eager"
          fetchPriority="high"
          width={1600}
          height={1000}
        />
      </div>
      <div className="hero-artwork-scrim" aria-hidden="true" />

      <div className="container" style={{ position: 'relative', zIndex: 2 }}>
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
              aria-label="Explore collection"
            >
              <span>EXPLORE COLLECTION</span>
              <ArrowRight size={15} style={{ strokeWidth: 1.8 }} />
            </button>
          </div>
        </div>
      </div>

      {/* Decorative Slide Counter & Scroll Indicator */}
      <div className="hero-meta-decor" aria-hidden="true">
        <span className="hero-slide-counter">01 / 04</span>
        <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(184, 121, 81, 0.3)' }} />
        <div className="hero-scroll-indicator">
          <span>SCROLL</span>
          <div className="scroll-line" />
        </div>
      </div>
    </section>
  );
};
