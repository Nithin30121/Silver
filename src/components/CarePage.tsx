import React from 'react';
import { useShop } from '../context/ShopContext';
import { Droplets, FlaskConical, Box, Wind, Sparkles, Shield, ArrowRight } from 'lucide-react';

const CARE_STEPS = [
  { icon: Droplets, title: 'Avoid Water', text: 'Remove your jewellery before showering, swimming or engaging in water-related activities.' },
  { icon: FlaskConical, title: 'Avoid Chemicals', text: 'Keep your jewellery away from perfumes, lotions, hairsprays, sanitizers and household cleaning products.' },
  { icon: Box, title: 'Store Properly', text: 'Always store your jewellery in an airtight pouch or a jewellery box when not in use.' },
  { icon: Wind, title: 'Keep It Dry', text: 'Moisture and humidity can accelerate tarnishing. Ensure your jewellery is completely dry before storing it.' },
  { icon: Sparkles, title: 'Clean Gently', text: 'Use a soft, dry silver polishing cloth to restore its shine. Avoid harsh chemicals and abrasive materials.' },
  { icon: Shield, title: 'Avoid Physical Damage', text: 'Remove your jewellery during workouts, household chores and activities that may cause scratches or damage.' },
];

const sectionTitle: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '1rem', color: 'var(--color-text)' };
const bodyText: React.CSSProperties = { fontSize: '0.9375rem', lineHeight: '1.8', color: 'var(--color-text-muted)' };
const panel: React.CSSProperties = { padding: '2rem', backgroundColor: 'var(--color-ink)', border: '1px solid rgba(var(--rgb-line), 0.2)' };

export const CarePage: React.FC = () => {
  const { navigateTo } = useShop();

  return (
    <div style={{ backgroundColor: 'var(--color-black)', minHeight: '80vh', paddingBottom: '6rem' }}>
      <div style={{ backgroundColor: 'var(--color-band)', borderBottom: '1px solid rgba(var(--rgb-line), 0.22)', padding: '5.5rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: '800px', textAlign: 'center' }}>
          <span className="eyebrow">JEWELLERY CARE GUIDE</span>
          <h1 className="headline-editorial" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', marginBottom: '1.25rem', color: 'var(--color-text)' }}>
            A Little Care Goes a <em>Long Way!</em>
          </h1>
          <p style={{ fontSize: '1.0625rem', color: 'var(--color-text-muted)', lineHeight: '1.75' }}>
            At SILVORA LUXE, we believe every piece of jewellery deserves to shine for a lifetime.
          </p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: '880px', marginTop: '4rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        <section style={panel}>
          <h2 style={sectionTitle}>Why Does Silver Tarnish?</h2>
          <p style={bodyText}>
            Silver is a natural precious metal that reacts with sulphur compounds present in the air, causing a chemical reaction that leads to tarnishing. This may appear as a gradual darkening or dullness on the surface of your jewellery.
          </p>
          <p style={{ ...bodyText, marginTop: '1rem' }}>
            Tarnishing is a natural characteristic of genuine silver and is not necessarily a sign of poor quality or damage. The speed of tarnishing may vary depending on environmental conditions, humidity, body chemistry and exposure to everyday products.
          </p>
        </section>

        <section style={panel}>
          <h2 style={sectionTitle}>A Note on Genuine Silver</h2>
          <p style={bodyText}>
            Genuine silver may naturally develop a darker patina over time, while some silver jewellery may retain its shine longer due to protective coatings, plating or storage conditions. Therefore, the presence or absence of tarnish alone cannot determine whether silver is genuine.
          </p>
        </section>

        <section>
          <h2 style={sectionTitle}>How to Care for Your Silver Jewellery</h2>
          <p style={{ ...bodyText, marginBottom: '2rem' }}>
            To maintain the beauty, shine and longevity of your favourite pieces, please follow these simple precautions:
          </p>
          <div className="care-steps">
            {CARE_STEPS.map(({ icon: Icon, title, text }) => (
              <div key={title} style={{ ...panel, padding: '1.75rem' }}>
                <Icon size={22} style={{ color: 'var(--color-silver-accent)', marginBottom: '0.85rem' }} aria-hidden="true" />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>{title}</h3>
                <p style={{ fontSize: '0.875rem', lineHeight: '1.75', color: 'var(--color-text-muted)' }}>{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section style={{ ...panel, textAlign: 'center', padding: '2.75rem 2rem' }}>
          <h2 style={sectionTitle}>Love It. Wear It. Care for It.</h2>
          <p style={{ ...bodyText, maxWidth: '640px', margin: '0 auto' }}>
            With proper care, regular gentle cleaning and mindful storage, your silver jewellery can retain its beauty and charm for years to come.
          </p>
          <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontStyle: 'italic', lineHeight: '1.6', color: 'var(--color-text)', maxWidth: '640px', margin: '1.5rem auto 0' }}>
            Remember: A little tarnish is a natural part of silver’s journey. Treat your jewellery with care, and let it shine with you!
          </p>
        </section>

        <div style={{ textAlign: 'center' }}>
          <button className="btn-primary" onClick={() => navigateTo('collection')}>
            <span>Explore The Collection</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
