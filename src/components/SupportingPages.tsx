import React, { useState } from 'react';
import { Mail, MapPin, Phone, CheckCircle2 } from 'lucide-react';

export const ShippingPage: React.FC = () => {
  return (
    <div style={{ backgroundColor: 'var(--color-warm-ivory)', minHeight: '80vh', paddingBottom: '6rem' }}>
      <div style={{ backgroundColor: 'var(--color-soft-cream)', borderBottom: '1px solid var(--color-border)', padding: '5rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: '800px', textAlign: 'center' }}>
          <span className="eyebrow">TRANSIT & EXCHANGES</span>
          <h1 className="headline-editorial" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', marginBottom: '1.25rem' }}>
            Shipping & <em>Returns.</em>
          </h1>
          <p style={{ fontSize: '1.0625rem', color: 'var(--color-muted-grey)', lineHeight: '1.7' }}>
            Every SILVESTO LUXE ornament is dispatched in tamper-evident, fully insured luxury packaging.
          </p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: '840px', marginTop: '4rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <section>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '1rem' }}>
              Domestic Shipping (India)
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-muted-grey)', lineHeight: '1.8' }}>
              We provide complimentary insured express courier delivery on all domestic orders across India. Orders placed before 1:00 PM IST are processed the same business day. Delivery across major metro locations is completed within <strong>2 to 4 business days</strong>. A discrete, signature-required delivery ensures total security.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '1rem' }}>
              International Delivery
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-muted-grey)', lineHeight: '1.8' }}>
              We ship worldwide to over 45 countries via DHL Express and FedEx International Priority. International delivery typically takes <strong>5 to 8 business days</strong>. Tracking notifications with direct status links are transmitted immediately upon departure from our atelier.
            </p>
          </section>

          <section>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '1rem' }}>
              14-Day Complimentary Returns & Exchanges
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-muted-grey)', lineHeight: '1.8' }}>
              We understand the importance of perfect proportions. If you need a size exchange or wish to return an unworn piece in its original packaging with tags intact, we arrange complimentary doorstep courier pickup within <strong>14 days of delivery</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div style={{ backgroundColor: 'var(--color-warm-ivory)', minHeight: '80vh', paddingBottom: '6rem' }}>
      <div style={{ backgroundColor: 'var(--color-soft-cream)', borderBottom: '1px solid var(--color-border)', padding: '5rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: '800px', textAlign: 'center' }}>
          <span className="eyebrow">CLIENT CONCIERGE</span>
          <h1 className="headline-editorial" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', marginBottom: '1.25rem' }}>
            Connect with <em>Our Atelier.</em>
          </h1>
          <p style={{ fontSize: '1.0625rem', color: 'var(--color-muted-grey)', lineHeight: '1.7' }}>
            Our concierge team is at your disposal for sizing guidance, custom commissions, or private appointment inquiries.
          </p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: '880px', marginTop: '4rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.25fr', gap: '4rem' }}>
          {/* Info */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.65rem', marginBottom: '1.25rem' }}>Direct Inquiries</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--color-muted-grey)' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <Mail size={18} style={{ color: 'var(--color-champagne)', marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--color-deep-charcoal)', display: 'block' }}>Email Concierge</strong>
                  <span>concierge@silvestoluxe.com</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <Phone size={18} style={{ color: 'var(--color-champagne)', marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--color-deep-charcoal)', display: 'block' }}>Client Assistance</strong>
                  <span>+91 (0) 22 4589 7700</span>
                  <span style={{ display: 'block', fontSize: '0.75rem' }}>Mon–Sat, 10:00 AM – 7:00 PM IST</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <MapPin size={18} style={{ color: 'var(--color-champagne)', marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--color-deep-charcoal)', display: 'block' }}>Boutique & Showroom</strong>
                  <span>The Silvesto Atelier, Nariman Point, Mumbai 400021, India</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div>
            {submitted ? (
              <div style={{ padding: '2.5rem', backgroundColor: 'var(--color-soft-cream)', textAlign: 'center', border: '1px solid var(--color-border)' }}>
                <CheckCircle2 size={40} style={{ color: 'var(--color-champagne)', margin: '0 auto 1rem' }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>Inquiry Received</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-muted-grey)' }}>
                  Thank you, {formData.name}. A client advisor will respond within 24 business hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.35rem', fontWeight: 600 }}>Your Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-pure-white)', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.35rem', fontWeight: 600 }}>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-pure-white)', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.35rem', fontWeight: 600 }}>Subject</label>
                  <input
                    type="text"
                    placeholder="Sizing inquiry, appointment request, etc."
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-pure-white)', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.35rem', fontWeight: 600 }}>Message *</label>
                  <textarea
                    rows={4}
                    required
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid var(--color-border)', backgroundColor: 'var(--color-pure-white)', fontSize: '0.875rem', resize: 'vertical' }}
                  />
                </div>

                <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>
                  Transmit Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const FAQPage: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: 'What is 925 Sterling Silver, and how is it verified?',
      a: 'Sterling silver is an alloy composed of 92.5% pure silver and 7.5% copper or strengthening elements. Pure 99.9% silver is too soft to withstand daily jewellery wear. Every SILVESTO LUXE piece is stamped with the internationally recognized 925 hallmark and conforms to BIS hallmarking standards.'
    },
    {
      q: 'Will my silver ornaments tarnish over time?',
      a: 'All authentic silver naturally oxidizes when exposed to sulfur elements in the atmosphere. However, we finish each piece with a protective rhodium micro-coating to slow oxidation significantly. A gentle wipe with the complimentary micro-fibre polishing cloth effortlessly restores the high mirror shine.'
    },
    {
      q: 'How do I know my correct ring or bracelet size?',
      a: 'You can reference our interactive Sizing Chart on each product page. If you are unsure of your ring size, wrap a strip of paper around the intended finger, mark the overlap, and compare the measurement to our millimeter chart.'
    },
    {
      q: 'What packaging is included with each order?',
      a: 'Each ornament arrives in our signature linen-textured cream presentation box, nestled inside an anti-tarnish suede pouch, accompanied by a certificate of authenticity and a polishing cloth.'
    },
    {
      q: 'Can I exchange my piece if the size does not fit?',
      a: 'Yes. We offer a complimentary 14-day exchange window for unworn items in original condition. Contact our concierge team to schedule a pickup.'
    }
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-warm-ivory)', minHeight: '80vh', paddingBottom: '6rem' }}>
      <div style={{ backgroundColor: 'var(--color-soft-cream)', borderBottom: '1px solid var(--color-border)', padding: '5rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: '800px', textAlign: 'center' }}>
          <span className="eyebrow">COMMON INQUIRIES</span>
          <h1 className="headline-editorial" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', marginBottom: '1.25rem' }}>
            Frequently Asked <em>Questions.</em>
          </h1>
          <p style={{ fontSize: '1.0625rem', color: 'var(--color-muted-grey)', lineHeight: '1.7' }}>
            Everything you need to know about our silver purity, dimensions, craftsmanship, and policies.
          </p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: '800px', marginTop: '4rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--color-border)' }}>
          {faqs.map((faq, idx) => (
            <div key={idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <button
                style={{
                  width: '100%',
                  padding: '1.5rem 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textAlign: 'left',
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.25rem',
                  color: 'var(--color-deep-charcoal)'
                }}
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              >
                <span>{faq.q}</span>
                <span style={{ fontSize: '1.5rem', color: 'var(--color-champagne)', marginLeft: '1rem' }}>
                  {openIndex === idx ? '−' : '+'}
                </span>
              </button>
              {openIndex === idx && (
                <div style={{ paddingBottom: '1.5rem', fontSize: '0.9375rem', lineHeight: '1.8', color: 'var(--color-muted-grey)' }}>
                  <p>{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
