import React from 'react';
import { useShop } from '../context/ShopContext';
import { ArrowRight, Fingerprint, FlaskConical, Gem, MessageCircle, Search, ShieldCheck, Smartphone } from 'lucide-react';

/* The facts about BIS silver hallmarking below follow the Bureau of Indian Standards' scheme as of 2025: hallmarking
   silver is voluntary, every BIS-hallmarked silver piece has carried a HUID since 1 September 2025, and IS 2112:2025
   recognises the purity grades listed here. Check them again before changing the wording. */

const HALLMARK_PARTS = [
  { icon: ShieldCheck, title: 'The BIS Standard Mark', text: 'The Bureau of Indian Standards’ triangular logo, showing the piece was tested and marked under the official scheme.' },
  { icon: Gem, title: 'SILVER and Its Purity Grade', text: 'The word SILVER with the purity in parts per thousand. For sterling silver, that number is 925.' },
  { icon: Fingerprint, title: 'The HUID Code', text: 'A six-character code of letters and numbers, laser-marked and unique to that one piece, so its record can be looked up.' },
];

const CHECK_STEPS = [
  { icon: Search, title: 'Find the Marks', text: 'The marks are tiny, so use good light and your phone camera’s zoom. You’ll find where to look in the list above.' },
  { icon: Smartphone, title: 'Verify the HUID', text: 'If the piece has a six-character HUID, open the free BIS CARE app (Android and iPhone), choose Verify HUID and enter the code. It shows the type of article, its purity, when it was hallmarked, the testing centre and the jeweller’s registration.' },
  { icon: FlaskConical, title: 'Get It Tested', text: 'For an independent check, BIS-recognised Assaying & Hallmarking Centres test jewellery for purity, for a small fee.' },
  { icon: MessageCircle, title: 'Ask Us', text: 'Questions about one of our pieces? Contact us with your order number and we’ll gladly help.' },
];

const STAMP_PLACES = [
  ['Rings', 'inside the band'],
  ['Necklaces and chains', 'on or beside the clasp, or on a small tag near it'],
  ['Pendants', 'on the back, or on the loop the chain passes through'],
  ['Earrings', 'on the back, the post or the hook'],
  ['Bracelets and bangles', 'on the inside, or by the clasp'],
];

const sectionTitle: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '1rem', color: 'var(--color-text)' };
const bodyText: React.CSSProperties = { fontSize: '0.9375rem', lineHeight: '1.8', color: 'var(--color-text-muted)' };
const panel: React.CSSProperties = { padding: '2rem', backgroundColor: 'var(--color-ink)', border: '1px solid rgba(var(--rgb-line), 0.2)' };
const cardTitle: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: '1.3rem', marginBottom: '0.5rem', color: 'var(--color-text)' };
const cardText: React.CSSProperties = { fontSize: '0.875rem', lineHeight: '1.75', color: 'var(--color-text-muted)' };
const iconStyle: React.CSSProperties = { color: 'var(--color-silver-accent)', marginBottom: '0.85rem' };

export const HallmarkPage: React.FC = () => {
  const { navigateTo } = useShop();

  return (
    <div style={{ backgroundColor: 'var(--color-black)', minHeight: '80vh', paddingBottom: '6rem' }}>
      <div style={{ backgroundColor: 'var(--color-band)', borderBottom: '1px solid rgba(var(--rgb-line), 0.22)', padding: '5.5rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: '800px', textAlign: 'center' }}>
          <span className="eyebrow">925 HALLMARK</span>
          <h1 className="headline-editorial" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', marginBottom: '1.25rem', color: 'var(--color-text)' }}>
            Certified 925 <em>Hallmark.</em>
          </h1>
          <p style={{ fontSize: '1.0625rem', color: 'var(--color-text-muted)', lineHeight: '1.75' }}>
            Every SILVORA piece is crafted in 925 sterling silver: 92.5% pure silver, marked to say so. Here is what that
            mark means, where to find it, and how to check it.
          </p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: '880px', marginTop: '4rem', display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        <section style={panel}>
          <h2 style={sectionTitle}>What 925 Means</h2>
          <p style={bodyText}>
            The number 925 means that 925 parts in every 1,000 are pure silver, which is 92.5%. The other 7.5% is mostly
            copper. Pure silver is too soft to hold fine detail, settings and clasps for long, and this small share of
            copper gives the metal its strength while keeping silver’s colour and shine. Known as sterling silver, it is the
            standard for fine silver jewellery around the world.
          </p>
          <div className="hallmark-purity" role="img" aria-label="925 sterling silver: 92.5% pure silver and 7.5% copper and other metals">
            <div className="hallmark-purity-bar" aria-hidden="true">
              <span className="hallmark-purity-silver" />
              <span className="hallmark-purity-alloy" />
            </div>
            <div className="hallmark-purity-legend" aria-hidden="true">
              <span><strong>92.5%</strong> pure silver</span>
              <span><strong>7.5%</strong> copper and other metals</span>
            </div>
          </div>
        </section>

        <section style={panel}>
          <h2 style={sectionTitle}>Where to Find the Mark</h2>
          <p style={bodyText}>
            A purity mark is small and placed where it won’t spoil the design. Look here:
          </p>
          <ul className="hallmark-places">
            {STAMP_PLACES.map(([piece, place]) => (
              <li key={piece}><strong>{piece}:</strong> {place}</li>
            ))}
          </ul>
          <p style={{ ...bodyText, marginTop: '1rem' }}>
            On the finest pieces there may be no room on the piece itself, so the mark is usually on the clasp or a small tag.
          </p>
        </section>

        <section>
          <h2 style={sectionTitle}>Hallmarking in India</h2>
          <p style={bodyText}>
            In India, the Bureau of Indian Standards (BIS) runs the official hallmarking scheme, in which an independent,
            BIS-recognised centre tests a piece and marks its purity. For silver, BIS hallmarking is voluntary. Since
            1 September 2025, every silver piece that is BIS-hallmarked must carry a unique HUID code. A BIS silver hallmark
            has three parts:
          </p>
          <div className="care-steps hallmark-parts" style={{ marginTop: '2rem' }}>
            {HALLMARK_PARTS.map(({ icon: Icon, title, text }) => (
              <div key={title} style={{ ...panel, padding: '1.75rem' }}>
                <Icon size={22} style={iconStyle} aria-hidden="true" />
                <h3 style={cardTitle}>{title}</h3>
                <p style={cardText}>{text}</p>
              </div>
            ))}
          </div>
          <p style={{ ...bodyText, marginTop: '1.5rem' }}>
            BIS recognises seven purity grades for silver: 800, 835, 925, 958, 970, 990 and 999. Grade 925 is sterling
            silver, the grade used for fine jewellery.
          </p>
        </section>

        <section>
          <h2 style={sectionTitle}>How to Check a Piece</h2>
          <div className="care-steps">
            {CHECK_STEPS.map(({ icon: Icon, title, text }) => (
              <div key={title} style={{ ...panel, padding: '1.75rem' }}>
                <Icon size={22} style={iconStyle} aria-hidden="true" />
                <h3 style={cardTitle}>{title}</h3>
                <p style={cardText}>{text}</p>
              </div>
            ))}
          </div>
          <p style={{ ...bodyText, marginTop: '1.5rem' }}>
            Tarnish is not a purity test: genuine silver darkens naturally over time.{' '}
            <a href="/care" onClick={(event) => { event.preventDefault(); navigateTo('care'); }}
              style={{ color: 'var(--color-accent-text)', textDecoration: 'underline', textUnderlineOffset: '3px' }}>
              Our Jewellery Care Guide
            </a>{' '}
            explains why, and how to keep your pieces bright.
          </p>
        </section>

        <section style={{ ...panel, textAlign: 'center', padding: '2.75rem 2rem' }}>
          <h2 style={sectionTitle}>Our Promise</h2>
          <p style={{ ...bodyText, maxWidth: '640px', margin: '0 auto' }}>
            Every SILVORA piece is made in genuine 925 sterling silver. If you ever have a question about a piece’s purity,
            write to us with your order number and we’ll take care of it personally.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '1rem', marginTop: '2rem' }}>
            <button className="btn-primary" onClick={() => navigateTo('collection')}>
              <span>Explore The Collection</span>
              <ArrowRight size={14} />
            </button>
            <button className="btn-secondary" onClick={() => navigateTo('contact')}>
              <span>Contact Us</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
