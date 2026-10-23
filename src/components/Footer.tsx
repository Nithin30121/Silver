import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { ShieldCheck, ArrowRight, Check } from 'lucide-react';

export const Footer: React.FC = () => {
  const { navigateTo } = useShop();
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (newsletterEmail.trim()) {
      setSubscribed(true);
      setNewsletterEmail('');
    }
  };

  return (
    <footer className="site-footer" aria-label="Footer">
      <div className="container">
        <div className="footer-grid">
          {/* Brand Col */}
          <div>
            <a
              href="#home"
              className="brand-logo"
              style={{ fontSize: '1.45rem', marginBottom: '1.25rem' }}
              onClick={(e) => {
                e.preventDefault();
                navigateTo('home');
              }}
            >
              SILVORA
            </a>
            <p style={{ fontSize: '0.875rem', lineHeight: '1.75', color: 'var(--color-muted-grey)', maxWidth: '340px', marginBottom: '1.5rem' }}>
              Distinctive 925 sterling silver ornaments, crafted for moments that stay with you. Understated luxury through form, whitespace, and authentic noble metal.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.75rem', color: 'var(--color-soft-ivory)', fontWeight: 600 }}>
              <ShieldCheck size={18} style={{ color: 'var(--color-rose-gold)' }} />
              <span>Certified 925 BIS Hallmarked Silver</span>
            </div>
          </div>

          {/* Col 1: Collections */}
          <div>
            <h4 className="footer-heading">Collections</h4>
            <ul className="footer-links">
              <li>
                <a href="#new" className="footer-link" onClick={(e) => { e.preventDefault(); navigateTo('collection'); }}>
                  New Arrivals
                </a>
              </li>
              <li>
                <a href="#men" className="footer-link" onClick={(e) => { e.preventDefault(); navigateTo('men', { gender: 'men', category: 'all' }); }}>
                  Men's Jewellery
                </a>
              </li>
              <li>
                <a href="#women" className="footer-link" onClick={(e) => { e.preventDefault(); navigateTo('women', { gender: 'women', category: 'all' }); }}>
                  Women's Jewellery
                </a>
              </li>
              <li>
                <a href="#rings" className="footer-link" onClick={(e) => { e.preventDefault(); navigateTo('collection', { category: 'rings' }); }}>
                  Silver Rings
                </a>
              </li>
              <li>
                <a href="#bracelets" className="footer-link" onClick={(e) => { e.preventDefault(); navigateTo('collection', { category: 'bracelets' }); }}>
                  Cuffs & Bracelets
                </a>
              </li>
              <li>
                <a href="#necklaces" className="footer-link" onClick={(e) => { e.preventDefault(); navigateTo('collection', { category: 'necklaces' }); }}>
                  Pendants & Necklaces
                </a>
              </li>
            </ul>
          </div>

          {/* Col 2: Atelier & Care */}
          <div>
            <h4 className="footer-heading">Client Services</h4>
            <ul className="footer-links">
              <li>
                <a href="#story" className="footer-link" onClick={(e) => { e.preventDefault(); navigateTo('story'); }}>
                  Our Story
                </a>
              </li>
              <li>
                <a href="#care" className="footer-link" onClick={(e) => { e.preventDefault(); navigateTo('care'); }}>
                  Jewellery Care
                </a>
              </li>
              <li>
                <a href="#shipping" className="footer-link" onClick={(e) => { e.preventDefault(); navigateTo('shipping'); }}>
                  Shipping & Returns
                </a>
              </li>
              <li>
                <a href="#contact" className="footer-link" onClick={(e) => { e.preventDefault(); navigateTo('contact'); }}>
                  Client Concierge
                </a>
              </li>
              <li>
                <a href="#faq" className="footer-link" onClick={(e) => { e.preventDefault(); navigateTo('faq'); }}>
                  Frequently Asked Questions
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: Newsletter */}
          <div>
            <h4 className="footer-heading">The Atelier Gazette</h4>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted-grey)', lineHeight: '1.65', marginBottom: '1.25rem' }}>
              Subscribe to receive private archive previews, craftsmanship notes, and seasonal releases.
            </p>

            {subscribed ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--color-soft-ivory)', fontWeight: 600, padding: '0.75rem 0' }}>
                <Check size={16} style={{ color: 'var(--color-rose-gold)' }} />
                <span>You are now subscribed to the Gazette.</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} style={{ display: 'flex', borderBottom: '1px solid var(--color-metallic-copper)' }}>
                <input
                  type="email"
                  required
                  placeholder="Your email address"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '0.75rem 0',
                    border: 'none',
                    backgroundColor: 'transparent',
                    fontSize: '0.8125rem',
                    color: 'var(--color-soft-ivory)'
                  }}
                />
                <button
                  type="submit"
                  style={{ padding: '0 0.5rem', color: 'var(--color-rose-gold)' }}
                  aria-label="Subscribe to newsletter"
                >
                  <ArrowRight size={16} />
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="footer-bottom">
          <span>&copy; {new Date().getFullYear()} SILVORA. All Rights Reserved. Crafted in Pure 925 Sterling Silver.</span>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="#privacy" className="footer-link" onClick={(e) => { e.preventDefault(); navigateTo('faq'); }}>Privacy Policy</a>
            <a href="#terms" className="footer-link" onClick={(e) => { e.preventDefault(); navigateTo('shipping'); }}>Terms & Conditions</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
