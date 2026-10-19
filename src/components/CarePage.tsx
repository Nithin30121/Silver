import React from 'react';
import { useShop } from '../context/ShopContext';
import { Sparkles, Droplets, Sun, Box, ArrowRight } from 'lucide-react';

export const CarePage: React.FC = () => {
  const { navigateTo } = useShop();

  return (
    <div style={{ backgroundColor: 'var(--color-warm-ivory)', minHeight: '80vh', paddingBottom: '6rem' }}>
      <div style={{ backgroundColor: 'var(--color-soft-cream)', borderBottom: '1px solid var(--color-border)', padding: '5rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: '800px', textAlign: 'center' }}>
          <span className="eyebrow">PRESERVATION & CARE</span>
          <h1 className="headline-editorial" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', marginBottom: '1.25rem' }}>
            Caring for Your <em>Silver.</em>
          </h1>
          <p style={{ fontSize: '1.0625rem', color: 'var(--color-muted-grey)', lineHeight: '1.7' }}>
            Solid sterling silver is an enduring living metal. With mindful care, your pieces will maintain their warm, moonlit luster for decades.
          </p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: '880px', marginTop: '4rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '2.5rem' }}>
          <div style={{ padding: '2rem', backgroundColor: 'var(--color-soft-cream)', border: '1px solid var(--color-border)' }}>
            <Sparkles size={24} style={{ color: 'var(--color-champagne)', marginBottom: '1rem' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', marginBottom: '0.75rem' }}>Regular Polishing</h3>
            <p style={{ fontSize: '0.875rem', lineHeight: '1.7', color: 'var(--color-muted-grey)' }}>
              Use the micro-fibre polishing cloth provided with every SILVESTO LUXE order. Gently buff along the natural grain of the silver. Avoid circular scrubbing on satin-brushed surfaces.
            </p>
          </div>

          <div style={{ padding: '2rem', backgroundColor: 'var(--color-soft-cream)', border: '1px solid var(--color-border)' }}>
            <Droplets size={24} style={{ color: 'var(--color-champagne)', marginBottom: '1rem' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', marginBottom: '0.75rem' }}>Water & Chemicals</h3>
            <p style={{ fontSize: '0.875rem', lineHeight: '1.7', color: 'var(--color-muted-grey)' }}>
              Remove silver jewellery before swimming in chlorinated pools, soaking in hot mineral springs, or applying perfumes, lotions, and hairsprays. Chemicals accelerate surface oxidation.
            </p>
          </div>

          <div style={{ padding: '2rem', backgroundColor: 'var(--color-soft-cream)', border: '1px solid var(--color-border)' }}>
            <Box size={24} style={{ color: 'var(--color-champagne)', marginBottom: '1rem' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', marginBottom: '0.75rem' }}>Thoughtful Storage</h3>
            <p style={{ fontSize: '0.875rem', lineHeight: '1.7', color: 'var(--color-muted-grey)' }}>
              Store individual pieces in the airtight protective pouch or within the lined velvet box to prevent ambient moisture and friction scratches from adjacent ornaments.
            </p>
          </div>

          <div style={{ padding: '2rem', backgroundColor: 'var(--color-soft-cream)', border: '1px solid var(--color-border)' }}>
            <Sun size={24} style={{ color: 'var(--color-champagne)', marginBottom: '1rem' }} />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', marginBottom: '0.75rem' }}>Daily Wear Benefits</h3>
            <p style={{ fontSize: '0.875rem', lineHeight: '1.7', color: 'var(--color-muted-grey)' }}>
              Natural oils from your skin actually protect sterling silver from tarnishing. The best way to preserve your silver ornament is to wear it frequently and let it breathe.
            </p>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
          <button className="btn-primary" onClick={() => navigateTo('collection')}>
            <span>Explore The Collection</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
