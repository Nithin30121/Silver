import React from 'react';
import { useShop } from '../context/ShopContext';
import { ArrowRight, Sparkles, Shield, Compass } from 'lucide-react';

export const StoryPage: React.FC = () => {
  const { navigateTo } = useShop();

  return (
    <div style={{ backgroundColor: 'var(--color-obsidian-black)', minHeight: '80vh', paddingBottom: '6rem' }}>
      {/* Editorial Story Header */}
      <div style={{ backgroundColor: '#0d0a09', borderBottom: '1px solid rgba(184, 121, 81, 0.22)', padding: '5.5rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: '820px', textAlign: 'center' }}>
          <span className="eyebrow">OUR PHILOSOPHY</span>
          <h1 className="headline-editorial" style={{ fontSize: 'clamp(2.5rem, 5vw, 4.25rem)', marginBottom: '1.5rem', color: 'var(--color-soft-ivory)' }}>
            The Architecture of <em>Pure Silver.</em>
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--color-muted-grey)', lineHeight: '1.8' }}>
            SILVESTO LUXE was conceived around a single foundational conviction: silver is not a substitute for gold, but a distinct noble metal possessed of its own calm, architectural luminescence.
          </p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: '900px', marginTop: '4.5rem' }}>
        {/* Story Section 1: The Material */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3.5rem', alignItems: 'center', marginBottom: '5rem' }}>
          <div>
            <span className="eyebrow">THE NOBLE METAL</span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '1rem', lineHeight: '1.2', color: 'var(--color-soft-ivory)' }}>
              Quiet Confidence in 925 Sterling Silver
            </h2>
            <p style={{ fontSize: '0.9375rem', lineHeight: '1.8', color: 'var(--color-muted-grey)' }}>
              Silver possesses a reflectivity unlike any other precious metal—a cool, moonlit clarity that balances warmth and restraint. Each SILVESTO LUXE piece is forged exclusively from certified 925 hallmarked sterling silver, composed of 92.5% pure silver alloyed with copper for structural durability.
            </p>
            <p style={{ fontSize: '0.9375rem', lineHeight: '1.8', color: 'var(--color-muted-grey)', marginTop: '1rem' }}>
              We apply an invisible tarnish-retardant rhodium micro-barrier that preserves the mirror gleam while retaining the tactile authenticity of pure silver.
            </p>
          </div>

          <div style={{ aspectRatio: '4/3', backgroundColor: 'var(--color-rich-black)', border: '1px solid rgba(184, 121, 81, 0.25)', overflow: 'hidden' }}>
            <img
              src="/images/category_rings.jpg"
              alt="Sculptural sterling silver ring on dark slate stone"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        </div>

        {/* Story Section 2: Proportions & Restraint */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3.5rem', alignItems: 'center', marginBottom: '5rem' }}>
          <div style={{ aspectRatio: '4/3', backgroundColor: 'var(--color-rich-black)', border: '1px solid rgba(184, 121, 81, 0.25)', overflow: 'hidden' }}>
            <img
              src="/images/hero_silver_ring.jpg"
              alt="Intricate silver filigree details on obsidian"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          <div>
            <span className="eyebrow">FORM & DISCIPLINE</span>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', marginBottom: '1rem', lineHeight: '1.2', color: 'var(--color-soft-ivory)' }}>
              Beauty Through Whitespace & Detail
            </h2>
            <p style={{ fontSize: '0.9375rem', lineHeight: '1.8', color: 'var(--color-muted-grey)' }}>
              We avoid transient ornamental excess. Our silhouettes are defined by sculptural planes, beveled facets, and comfort-fit curves engineered to feel balanced and natural against the skin.
            </p>
            <p style={{ fontSize: '0.9375rem', lineHeight: '1.8', color: 'var(--color-muted-grey)', marginTop: '1rem' }}>
              Whether it is the solid heft of an octagonal signet or the fluid undulation of an open wave band, every piece is conceived to be worn continuously—forming a personal patina that deepens with memory.
            </p>
          </div>
        </div>

        {/* Pillars */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', padding: '3rem 2rem', backgroundColor: '#100D0B', border: '1px solid rgba(184, 121, 81, 0.22)', textAlign: 'center', marginBottom: '5rem' }}>
          <div>
            <Sparkles size={24} style={{ color: 'var(--color-rose-gold)', margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--color-soft-ivory)' }}>Honest Craft</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted-grey)', lineHeight: '1.6' }}>
              Zero hollowed shells or base metals. Solid cores built for weight, strength, and tactile presence.
            </p>
          </div>

          <div>
            <Shield size={24} style={{ color: 'var(--color-rose-gold)', margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--color-soft-ivory)' }}>Verified Purity</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted-grey)', lineHeight: '1.6' }}>
              Independently hallmarked with genuine 925 verification stamped into every ornament.
            </p>
          </div>

          <div>
            <Compass size={24} style={{ color: 'var(--color-rose-gold)', margin: '0 auto 0.75rem' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', marginBottom: '0.5rem', color: 'var(--color-soft-ivory)' }}>Timeless Intent</h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted-grey)', lineHeight: '1.6' }}>
              Pieces intended to endure seasonal trends and accompany life's enduring chapters.
            </p>
          </div>
        </div>

        {/* Explore CTA */}
        <div style={{ textAlign: 'center' }}>
          <button
            className="btn-primary"
            onClick={() => navigateTo('collection')}
          >
            <span>Explore The Collection</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
