import React from 'react';
import { useShop } from '../context/ShopContext';
import { whatsappLink } from '../lib/whatsapp';
import { WhatsAppIcon } from './WhatsAppIcon';
import { Image as ImageIcon, FileText, BadgeCheck, Gem, Check, ArrowRight } from 'lucide-react';

const OFFERS = [
  'Custom designs based on your reference pictures.',
  'Personalised jewellery made according to your preferences.',
  'Customisation available in pure gold and pure silver.',
  'Quotes provided according to the design, material, weight and specifications.',
  'Every design and quotation will be discussed with you before we proceed.',
];

const STEPS = [
  { icon: ImageIcon, title: 'Share Your Inspiration', text: 'Send us a picture, screenshot, sketch or reference design of the jewellery you wish to create.' },
  { icon: FileText, title: 'Get Your Personalised Quote', text: "We'll review your design and provide a quotation based on the material, weight and craftsmanship required." },
  { icon: BadgeCheck, title: 'Approve Before We Create', text: "We'll discuss the details with you, answer your questions and proceed only after your approval and satisfaction with the agreed design, quotation and terms." },
  { icon: Gem, title: 'Made Especially for You', text: "Once everything is finalised, we'll begin creating your personalised piece of jewellery." },
];

const sectionTitle: React.CSSProperties = { fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '1rem', color: 'var(--color-text)' };
const bodyText: React.CSSProperties = { fontSize: '0.9375rem', lineHeight: '1.8', color: 'var(--color-text-muted)' };
const panel: React.CSSProperties = { padding: '2rem', backgroundColor: 'var(--color-ink)', border: '1px solid rgba(var(--rgb-line), 0.2)' };

/** Custom Design: personalised gold and silver pieces made from the customer's own references. */
export const CustomDesignPage: React.FC = () => {
  const { navigateTo } = useShop();
  // Opens a WhatsApp chat with the shop; until the shop's number is set, the button leads to the contact page.
  const chatLink = whatsappLink("Hello SILVORA, I'd like to discuss a custom jewellery design.");

  return (
    <div style={{ backgroundColor: 'var(--color-black)', minHeight: '80vh', paddingBottom: '6rem' }}>
      <div style={{ backgroundColor: 'var(--color-band)', borderBottom: '1px solid rgba(var(--rgb-line), 0.22)', padding: '5.5rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: '820px', textAlign: 'center' }}>
          <span className="eyebrow">CUSTOM DESIGN</span>
          <h1 className="headline-editorial" style={{ fontSize: 'clamp(2.3rem, 5vw, 3.75rem)', marginBottom: '1.25rem', color: 'var(--color-text)' }}>
            Your Vision. Our Craft. <em>Your Very Own Masterpiece.</em>
          </h1>
          <p style={{ fontSize: '1.0625rem', color: 'var(--color-text-muted)', lineHeight: '1.75' }}>
            Why settle for something ordinary when you can create something uniquely yours?
          </p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: '1120px', marginTop: '4rem', display: 'flex', flexDirection: 'column', gap: '3.5rem' }}>
        <div className="custom-split custom-split--photo-right">
          <figure className="custom-photo">
            <img src="/images/custom_silk_flatlay.webp" alt="Gold and silver rings, earrings and pendants arranged on ivory silk"
              decoding="async" style={{ objectPosition: '78% 50%' }} />
          </figure>
          <section style={panel}>
            <p style={bodyText}>At SILVORA, we believe jewellery should be as unique as the person wearing it.</p>
            <p style={{ ...bodyText, marginTop: '1rem' }}>
              Have a picture of your dream jewellery? A design you've always wanted? Or perhaps an idea you've never found anywhere else?
            </p>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontStyle: 'italic', lineHeight: '1.5', color: 'var(--color-text)', margin: '1.5rem 0' }}>
              Show us what you love, and let us bring it to life.
            </p>
            <p style={bodyText}>
              We offer personalised jewellery customisation in <strong style={{ color: 'var(--color-text)' }}>pure gold and pure silver</strong>, crafted
              according to your preferred design and requirements.
            </p>
            <p style={{ ...bodyText, marginTop: '1rem' }}>
              Whether it's a ring, necklace, bracelet, earrings or something entirely your own, we're here to make your vision a reality.
            </p>
          </section>
        </div>

        <div className="custom-split">
          <figure className="custom-photo">
            <img src="/images/custom_marble_collection.webp" alt="Gold and silver rings, earrings, bracelets and necklaces laid out on white marble"
              loading="lazy" decoding="async" />
          </figure>
          <section style={panel}>
            <h2 style={sectionTitle}>Your Idea. Your Choice. Your Jewellery.</h2>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {OFFERS.map((offer) => (
                <li key={offer} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', ...bodyText }}>
                  <Check size={18} style={{ color: 'var(--color-silver-accent)', flexShrink: 0, marginTop: '0.3rem' }} aria-hidden="true" />
                  <span>{offer}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section>
          <h2 style={sectionTitle}>How Does It Work?</h2>
          <ol className="care-steps" style={{ listStyle: 'none' }}>
            {STEPS.map(({ icon: Icon, title, text }, index) => (
              <li key={title} style={{ ...panel, padding: '1.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', lineHeight: 1, color: 'var(--color-silver-accent)' }}>
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <Icon size={22} style={{ color: 'var(--color-silver-accent)' }} aria-hidden="true" />
                </div>
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>{title}</h3>
                <p style={{ fontSize: '0.875rem', lineHeight: '1.75', color: 'var(--color-text-muted)' }}>{text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* A dark ruby band beside the workbench photo; inside it the colour names hold blush text and rose gold. */}
        <section className="custom-cta">
          <figure className="custom-photo">
            <img src="/images/custom_artisan_bench.webp" alt="A jeweller's hands finishing a gold band at the workbench"
              loading="lazy" decoding="async" style={{ objectPosition: '45% 50%' }} />
          </figure>
          <div className="custom-cta-body">
            <h2 style={sectionTitle}>Let's Create Something That's Uniquely Yours.</h2>
            <p style={{ ...bodyText, maxWidth: '640px', margin: '0 auto' }}>
              Your dream design is just one conversation away. Whether it's pure gold or pure silver, let's bring your imagination to life.
            </p>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontStyle: 'italic', color: 'var(--color-text)', margin: '1.5rem 0' }}>
              Have a design in mind? Let's talk!
            </p>
            {chatLink ? (
              <a className="btn-primary" href={chatLink} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon size={16} />
                <span>Chat with us on WhatsApp</span>
              </a>
            ) : (
              <button className="btn-primary" onClick={() => navigateTo('contact')}>
                <span>Contact Us</span>
                <ArrowRight size={14} />
              </button>
            )}
            <p style={{ fontSize: '0.8125rem', fontStyle: 'italic', lineHeight: '1.7', color: 'var(--color-text-muted)', maxWidth: '520px', margin: '1.25rem auto 0' }}>
              Connect directly with SILVORA LUXE for personal assistance, design discussions and custom jewellery enquiries.
            </p>
            <p style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', letterSpacing: '0.04em', color: 'var(--color-silver-accent)', marginTop: '1.75rem' }}>
              SILVORA LUXE – Crafted Around Your Imagination.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
};
