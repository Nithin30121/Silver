import React, { useRef, useState } from 'react';
import { Mail, MapPin, Phone, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useShop } from '../context/ShopContext';
import { sendContactMessage, type ContactInput } from '../services/contactService';
import { CustomerApiError } from '../services/customerApi';
import { validateEmail } from '../lib/authValidation';

type ContactField = 'name' | 'email' | 'phone' | 'subject' | 'orderNumber' | 'message';
const MAX_MESSAGE = 5000;

function validateContact(form: ContactInput): Partial<Record<ContactField, string>> {
  const name = form.name.trim();
  const phone = form.phone.trim();
  const message = form.message.trim();
  return {
    name: !name ? 'Please enter your name.' : name.length > 120 ? 'Please keep your name under 120 characters.' : undefined,
    email: validateEmail(form.email),
    phone: phone && !/^\+?[0-9 ()-]{7,20}$/.test(phone) ? 'Please enter a valid phone number, or leave it empty.' : undefined,
    subject: form.subject.trim().length > 150 ? 'Please keep the subject under 150 characters.' : undefined,
    message: !message ? 'Please write your message.' : message.length > MAX_MESSAGE ? `Please keep your message under ${MAX_MESSAGE.toLocaleString('en-IN')} characters.` : undefined,
  };
}

export const ShippingPage: React.FC = () => {
  return (
    <div style={{ backgroundColor: 'var(--color-black)', minHeight: '80vh', paddingBottom: '6rem' }}>
      <div style={{ backgroundColor: '#0c0c0e', borderBottom: '1px solid rgba(143, 146, 153, 0.22)', padding: '5.5rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: '800px', textAlign: 'center' }}>
          <span className="eyebrow">TRANSIT & EXCHANGES</span>
          <h1 className="headline-editorial" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', marginBottom: '1.25rem', color: 'var(--color-text)' }}>
            Shipping & <em>Returns.</em>
          </h1>
          <p style={{ fontSize: '1.0625rem', color: 'var(--color-text-muted)', lineHeight: '1.75' }}>
            Every SILVORA ornament is dispatched in tamper-evident, fully insured luxury packaging.
          </p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: '840px', marginTop: '4rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          <section style={{ padding: '2rem', backgroundColor: '#0E0F11', border: '1px solid rgba(143, 146, 153, 0.2)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
              Domestic Shipping (India)
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted)', lineHeight: '1.8' }}>
              We provide complimentary insured express courier delivery on all domestic orders across India. Orders placed before 1:00 PM IST are processed the same business day. Delivery across major metro locations is completed within <strong style={{ color: 'var(--color-text)' }}>2 to 4 business days</strong>. A discrete, signature-required delivery ensures total security.
            </p>
          </section>

          <section style={{ padding: '2rem', backgroundColor: '#0E0F11', border: '1px solid rgba(143, 146, 153, 0.2)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
              International Delivery
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted)', lineHeight: '1.8' }}>
              We ship worldwide to over 45 countries via DHL Express and FedEx International Priority. International delivery typically takes <strong style={{ color: 'var(--color-text)' }}>5 to 8 business days</strong>. Tracking notifications with direct status links are transmitted immediately upon departure from our atelier.
            </p>
          </section>

          <section style={{ padding: '2rem', backgroundColor: '#0E0F11', border: '1px solid rgba(143, 146, 153, 0.2)' }}>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', marginBottom: '1rem', color: 'var(--color-text)' }}>
              14-Day Complimentary Returns & Exchanges
            </h2>
            <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted)', lineHeight: '1.8' }}>
              We understand the importance of perfect proportions. If you need a size exchange or wish to return an unworn piece in its original packaging with tags intact, we arrange complimentary doorstep courier pickup within <strong style={{ color: 'var(--color-text)' }}>14 days of delivery</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export const ContactPage: React.FC = () => {
  const { user, profile } = useAuth();
  const { contactOrderNumber } = useShop();
  const blank = (): ContactInput => ({
    name: profile?.fullName ?? '', email: user?.email ?? '', phone: '', subject: contactOrderNumber ? `About order ${contactOrderNumber}` : '',
    orderNumber: contactOrderNumber ?? '', message: '', website: ''
  });
  const [form, setForm] = useState<ContactInput>(blank);
  const [errors, setErrors] = useState<Partial<Record<ContactField, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sentTo, setSentTo] = useState<{ name: string; email: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const field = (name: ContactField) => ({
    id: `contact-${name}`,
    value: form[name],
    'aria-invalid': errors[name] ? true : undefined,
    'aria-describedby': errors[name] ? `contact-${name}-error` : undefined,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm({ ...form, [name]: e.target.value });
      setErrors((previous) => ({ ...previous, [name]: undefined }));
    },
  });
  const fieldError = (name: ContactField) => errors[name] && <p id={`contact-${name}-error`} className="contact-error">{errors[name]}</p>;
  const focusFirst = (found: Partial<Record<ContactField, string>>) => {
    const first = (['name', 'email', 'phone', 'subject', 'orderNumber', 'message'] as const).find((name) => found[name]);
    if (first) formRef.current?.querySelector<HTMLElement>(`#contact-${first}`)?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSending) return;
    const found = validateContact(form);
    setErrors(found);
    setFormError(null);
    if (Object.values(found).some(Boolean)) return focusFirst(found);
    setIsSending(true);
    try {
      await sendContactMessage({ ...form, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim(),
        subject: form.subject.trim(), orderNumber: form.orderNumber.trim(), message: form.message.trim() });
      setSentTo({ name: form.name.trim(), email: form.email.trim() });
    } catch (error) {
      if (error instanceof CustomerApiError && Object.keys(error.fields).length > 0) {
        setErrors(error.fields as Partial<Record<ContactField, string>>);
        focusFirst(error.fields as Partial<Record<ContactField, string>>);
      } else {
        setFormError(error instanceof Error ? error.message : 'We could not send your message. Please try again in a moment.');
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div style={{ backgroundColor: 'var(--color-black)', minHeight: '80vh', paddingBottom: '6rem' }}>
      <div style={{ backgroundColor: '#0c0c0e', borderBottom: '1px solid rgba(143, 146, 153, 0.22)', padding: '5.5rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: '800px', textAlign: 'center' }}>
          <span className="eyebrow">CLIENT CONCIERGE</span>
          <h1 className="headline-editorial" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', marginBottom: '1.25rem', color: 'var(--color-text)' }}>
            Connect with <em>Our Atelier.</em>
          </h1>
          <p style={{ fontSize: '1.0625rem', color: 'var(--color-text-muted)', lineHeight: '1.75' }}>
            Our concierge team is at your disposal for sizing guidance, custom commissions, or private appointment inquiries.
          </p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: '880px', marginTop: '4rem' }}>
        <div className="contact-layout">
          {/* Info */}
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.65rem', marginBottom: '1.25rem', color: 'var(--color-text)' }}>Direct Inquiries</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <Mail size={18} style={{ color: 'var(--color-silver-accent)', marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--color-text)', display: 'block' }}>Email Concierge</strong>
                  <span>concierge@silvestoluxe.com</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <Phone size={18} style={{ color: 'var(--color-silver-accent)', marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--color-text)', display: 'block' }}>Client Assistance</strong>
                  <span>+91 (0) 22 4589 7700</span>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Mon–Sat, 10:00 AM – 7:00 PM IST</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <MapPin size={18} style={{ color: 'var(--color-silver-accent)', marginTop: '2px' }} />
                <div>
                  <strong style={{ color: 'var(--color-text)', display: 'block' }}>Boutique & Showroom</strong>
                  <span>The SILVORA Atelier, Nariman Point, Mumbai 400021, India</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div>
            {sentTo ? (
              <div className="contact-sent" role="status">
                <CheckCircle2 size={40} style={{ color: 'var(--color-silver-accent)', margin: '0 auto 1rem' }} />
                <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--color-text)' }}>Message Sent</h3>
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                  Thank you, {sentTo.name}. A client advisor will reply to <strong style={{ color: 'var(--color-text)' }}>{sentTo.email}</strong> within 24 business hours.
                </p>
                <button type="button" className="btn-text" style={{ marginTop: '1.25rem' }}
                  onClick={() => { setSentTo(null); setForm({ ...blank(), name: form.name, email: form.email }); setErrors({}); }}>
                  Send Another Message
                </button>
              </div>
            ) : (
              <form ref={formRef} className="contact-form" onSubmit={(e) => void handleSubmit(e)} noValidate aria-busy={isSending}>
                {formError && <p className="contact-form-error" role="alert">{formError}</p>}
                <div className="contact-field">
                  <label className="contact-label" htmlFor="contact-name">Your Name *</label>
                  <input {...field('name')} className="contact-input" type="text" autoComplete="name" maxLength={120} />
                  {fieldError('name')}
                </div>
                <div className="contact-row">
                  <div className="contact-field">
                    <label className="contact-label" htmlFor="contact-email">Email Address *</label>
                    <input {...field('email')} className="contact-input" type="email" autoComplete="email" maxLength={254} />
                    {fieldError('email')}
                  </div>
                  <div className="contact-field">
                    <label className="contact-label" htmlFor="contact-phone">Phone <span>(optional)</span></label>
                    <input {...field('phone')} className="contact-input" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} placeholder="+91 98765 43210" />
                    {fieldError('phone')}
                  </div>
                </div>
                <div className="contact-row">
                  <div className="contact-field">
                    <label className="contact-label" htmlFor="contact-subject">Subject</label>
                    <input {...field('subject')} className="contact-input" type="text" maxLength={150} placeholder="Sizing, an order, an appointment…" />
                    {fieldError('subject')}
                  </div>
                  <div className="contact-field">
                    <label className="contact-label" htmlFor="contact-orderNumber">Order Number <span>(optional)</span></label>
                    <input {...field('orderNumber')} className="contact-input" type="text" maxLength={40} placeholder="SL-2026-…" />
                    {fieldError('orderNumber')}
                  </div>
                </div>
                <div className="contact-field">
                  <label className="contact-label" htmlFor="contact-message">Message *</label>
                  <textarea {...field('message')} className="contact-input" rows={5} maxLength={MAX_MESSAGE} />
                  {fieldError('message')}
                </div>
                {/* Hidden from people (and screen readers); bots that fill in every box give themselves away. */}
                <div className="contact-trap" aria-hidden="true">
                  <label htmlFor="contact-website">Website</label>
                  <input id="contact-website" type="text" tabIndex={-1} autoComplete="off" value={form.website}
                    onChange={(e) => setForm({ ...form, website: e.target.value })} />
                </div>
                <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }} disabled={isSending}>
                  {isSending && <span className="auth-spinner" aria-hidden="true" />}
                  <span>{isSending ? 'Sending…' : 'Send Message'}</span>
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
      a: 'Sterling silver is an alloy composed of 92.5% pure silver and 7.5% copper or strengthening elements. Pure 99.9% silver is too soft to withstand daily jewellery wear. Every SILVORA piece is stamped with the internationally recognized 925 hallmark and conforms to BIS hallmarking standards.'
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
      a: 'Each ornament arrives in our signature bespoke presentation box, nestled inside an anti-tarnish suede pouch, accompanied by a certificate of authenticity and a polishing cloth.'
    },
    {
      q: 'Can I exchange my piece if the size does not fit?',
      a: 'Yes. We offer a complimentary 14-day exchange window for unworn items in original condition. Contact our concierge team to schedule a pickup.'
    }
  ];

  return (
    <div style={{ backgroundColor: 'var(--color-black)', minHeight: '80vh', paddingBottom: '6rem' }}>
      <div style={{ backgroundColor: '#0c0c0e', borderBottom: '1px solid rgba(143, 146, 153, 0.22)', padding: '5.5rem 0 4rem' }}>
        <div className="container" style={{ maxWidth: '800px', textAlign: 'center' }}>
          <span className="eyebrow">COMMON INQUIRIES</span>
          <h1 className="headline-editorial" style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', marginBottom: '1.25rem', color: 'var(--color-text)' }}>
            Frequently Asked <em>Questions.</em>
          </h1>
          <p style={{ fontSize: '1.0625rem', color: 'var(--color-text-muted)', lineHeight: '1.75' }}>
            Everything you need to know about our silver purity, dimensions, craftsmanship, and policies.
          </p>
        </div>
      </div>

      <div className="container" style={{ maxWidth: '800px', marginTop: '4rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid rgba(143, 146, 153, 0.2)' }}>
          {faqs.map((faq, idx) => (
            <div key={idx} style={{ borderBottom: '1px solid rgba(143, 146, 153, 0.2)' }}>
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
                  color: 'var(--color-text)'
                }}
                onClick={() => setOpenIndex(openIndex === idx ? null : idx)}
              >
                <span>{faq.q}</span>
                <span style={{ fontSize: '1.5rem', color: 'var(--color-silver-accent)', marginLeft: '1rem' }}>
                  {openIndex === idx ? '−' : '+'}
                </span>
              </button>
              {openIndex === idx && (
                <div style={{ paddingBottom: '1.5rem', fontSize: '0.9375rem', lineHeight: '1.8', color: 'var(--color-text-muted)' }}>
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
