import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { ProductCard } from './FeaturedProducts';
import { 
  Heart, 
  ShoppingBag, 
  ShieldCheck, 
  Truck, 
  Sparkles, 
  ChevronRight, 
  Minus, 
  Plus, 
  HelpCircle,
  X
} from 'lucide-react';

export const ProductDetailPage: React.FC = () => {
  const { currentProduct, products, addToCart, isWishlisted, toggleWishlist, navigateTo } = useShop();

  if (!currentProduct) {
    return (
      <div className="container" style={{ padding: '8rem 2rem', textAlign: 'center', backgroundColor: 'var(--color-obsidian-black)' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--color-soft-ivory)' }}>Piece Not Found</h2>
        <p style={{ marginTop: '1rem', color: 'var(--color-muted-grey)' }}>The silver ornament you requested could not be located.</p>
        <button
          className="btn-primary"
          style={{ marginTop: '2rem' }}
          onClick={() => navigateTo('collection')}
        >
          Return to Collection
        </button>
      </div>
    );
  }

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>(
    currentProduct.availableSizes ? currentProduct.availableSizes[0] : 'Standard'
  );
  const [quantity, setQuantity] = useState(1);
  const [activeAccordion, setActiveAccordion] = useState<'details' | 'care' | 'shipping' | null>('details');
  const [sizeModalOpen, setSizeModalOpen] = useState(false);

  const wishlisted = isWishlisted(currentProduct.id);

  const formattedPrice = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(currentProduct.price);

  const relatedProducts = products
    .filter((p) => p.id !== currentProduct.id && (p.category === currentProduct.category || p.gender === currentProduct.gender))
    .slice(0, 4);

  return (
    <div style={{ backgroundColor: 'var(--color-obsidian-black)', minHeight: '90vh', paddingBottom: '6rem' }}>
      {/* Breadcrumb Navigation */}
      <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '1.5rem' }}>
        <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-muted-grey)' }}>
          <a href="#home" onClick={(e) => { e.preventDefault(); navigateTo('home'); }} style={{ color: 'var(--color-muted-grey)' }}>Home</a>
          <ChevronRight size={12} style={{ color: 'var(--color-metallic-copper)' }} />
          <a
            href="#collection"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('collection', { category: currentProduct.category, gender: 'all' });
            }}
            style={{ color: 'var(--color-muted-grey)' }}
          >
            {currentProduct.category}
          </a>
          <ChevronRight size={12} style={{ color: 'var(--color-metallic-copper)' }} />
          <span style={{ color: 'var(--color-soft-ivory)', fontWeight: 600 }}>{currentProduct.name}</span>
        </nav>
      </div>

      {/* Main Two-Column Layout */}
      <div className="container">
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.1fr 1fr',
            gap: '4.5rem',
            alignItems: 'start'
          }}
          className="product-detail-grid"
        >
          {/* Left: Product Gallery */}
          <div>
            {/* Primary Large Image */}
            <div
              style={{
                width: '100%',
                aspectRatio: '3 / 4',
                backgroundColor: 'var(--color-rich-black)',
                border: '1px solid rgba(184, 121, 81, 0.28)',
                overflow: 'hidden',
                position: 'relative',
                boxShadow: '0 16px 40px rgba(0, 0, 0, 0.7)'
              }}
            >
              <img
                src={currentProduct.images[activeImageIndex] || currentProduct.images[0]}
                alt={`${currentProduct.name} main view`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                loading="eager"
              />
              <span className="product-badge-tag" style={{ top: '1.25rem', left: '1.25rem' }}>
                {currentProduct.purity}
              </span>
            </div>

            {/* Thumbnail Row */}
            {currentProduct.images.length > 1 && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.25rem' }}>
                {currentProduct.images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveImageIndex(idx)}
                    style={{
                      width: '84px',
                      height: '105px',
                      overflow: 'hidden',
                      border: activeImageIndex === idx ? '2px solid var(--color-metallic-copper)' : '1px solid rgba(184, 121, 81, 0.25)',
                      backgroundColor: 'var(--color-rich-black)',
                      opacity: activeImageIndex === idx ? 1 : 0.6,
                      boxShadow: activeImageIndex === idx ? '0 0 15px rgba(184, 121, 81, 0.25)' : 'none',
                      transition: 'var(--transition-fast)'
                    }}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right: Product Information and Controls */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <span className="eyebrow">{currentProduct.purity}</span>
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem, 3.5vw, 3rem)', lineHeight: '1.15', marginBottom: '0.5rem', color: 'var(--color-soft-ivory)' }}>
                {currentProduct.name}
              </h1>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-muted-grey)' }}>
                {currentProduct.subtitle}
              </p>
            </div>

            {/* Price Row */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(184, 121, 81, 0.2)' }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 600, color: 'var(--color-champagne)' }}>
                {formattedPrice}
              </span>
              {currentProduct.originalPrice && (
                <span style={{ fontSize: '1.1rem', color: 'var(--color-muted-grey)', textDecoration: 'line-through' }}>
                  ₹{currentProduct.originalPrice.toLocaleString('en-IN')}
                </span>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--color-rose-gold)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Includes GST & Insured Transit
              </span>
            </div>

            {/* Short Description */}
            <p style={{ fontSize: '0.95rem', lineHeight: '1.75', color: 'var(--color-muted-grey)' }}>
              {currentProduct.description}
            </p>

            {/* Verified Specifications Snippet */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', padding: '1.25rem', backgroundColor: '#100D0B', border: '1px solid rgba(184, 121, 81, 0.22)', fontSize: '0.8125rem' }}>
              <div>
                <span style={{ color: 'var(--color-rose-gold)', display: 'block', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.2rem' }}>Material</span>
                <strong style={{ color: 'var(--color-soft-ivory)' }}>{currentProduct.material}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-rose-gold)', display: 'block', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.2rem' }}>Weight</span>
                <strong style={{ color: 'var(--color-soft-ivory)' }}>{currentProduct.weightGrams ? `${currentProduct.weightGrams}g` : 'Standard Weight'}</strong>
              </div>
            </div>

            {/* Size Selector (If Available) */}
            {currentProduct.availableSizes && currentProduct.availableSizes.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--color-soft-ivory)' }}>
                    Select Size: <strong style={{ color: 'var(--color-champagne)' }}>{selectedSize}</strong>
                  </label>
                  <button
                    className="btn-text"
                    style={{ fontSize: '0.7rem' }}
                    onClick={() => setSizeModalOpen(true)}
                  >
                    <HelpCircle size={12} />
                    <span>Size Guide</span>
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                  {currentProduct.availableSizes.map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setSelectedSize(sz)}
                      style={{
                        padding: '0.65rem 1.25rem',
                        fontSize: '0.8125rem',
                        letterSpacing: '0.08em',
                        border: selectedSize === sz ? '1px solid var(--color-metallic-copper)' : '1px solid rgba(184, 121, 81, 0.25)',
                        backgroundColor: selectedSize === sz ? 'rgba(27, 23, 20, 0.95)' : 'rgba(16, 13, 11, 0.6)',
                        color: selectedSize === sz ? 'var(--color-champagne)' : 'var(--color-muted-grey)',
                        boxShadow: selectedSize === sz ? '0 0 12px rgba(184, 121, 81, 0.2)' : 'none',
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity Selector & Add to Bag */}
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
              {/* Quantity */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid rgba(184, 121, 81, 0.3)',
                  backgroundColor: '#100D0B',
                  height: '52px'
                }}
              >
                <button
                  style={{ width: '40px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-soft-ivory)' }}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span style={{ width: '36px', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-soft-ivory)' }}>
                  {quantity}
                </span>
                <button
                  style={{ width: '40px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-soft-ivory)' }}
                  onClick={() => setQuantity(quantity + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Add to Bag Primary CTA */}
              <button
                className="btn-primary"
                style={{ flex: 1, height: '52px' }}
                onClick={() => addToCart(currentProduct, selectedSize, quantity)}
              >
                <ShoppingBag size={16} />
                <span>Add to Bag</span>
              </button>

              {/* Wishlist Button */}
              <button
                style={{
                  width: '52px',
                  height: '52px',
                  border: '1px solid rgba(184, 121, 81, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: wishlisted ? '#1c1714' : '#100D0B',
                  color: wishlisted ? 'var(--color-rose-gold)' : 'var(--color-soft-ivory)',
                  transition: 'var(--transition-fast)'
                }}
                onClick={() => toggleWishlist(currentProduct.id)}
                aria-label="Wishlist toggle"
              >
                <Heart
                  size={18}
                  style={{
                    fill: wishlisted ? 'var(--color-rose-gold)' : 'none',
                    strokeWidth: 1.8
                  }}
                />
              </button>
            </div>

            {/* Value Guarantees */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(184, 121, 81, 0.2)' }}>
              <div style={{ textAlign: 'center' }}>
                <ShieldCheck size={18} style={{ color: 'var(--color-rose-gold)', margin: '0 auto 0.35rem' }} />
                <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-soft-ivory)' }}>
                  BIS Hallmarked
                </span>
                <span style={{ fontSize: '0.625rem', color: 'var(--color-muted-grey)' }}>Authentic 92.5% Silver</span>
              </div>

              <div style={{ textAlign: 'center' }}>
                <Truck size={18} style={{ color: 'var(--color-rose-gold)', margin: '0 auto 0.35rem' }} />
                <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-soft-ivory)' }}>
                  Express Transit
                </span>
                <span style={{ fontSize: '0.625rem', color: 'var(--color-muted-grey)' }}>Insured 2–4 Business Days</span>
              </div>

              <div style={{ textAlign: 'center' }}>
                <Sparkles size={18} style={{ color: 'var(--color-rose-gold)', margin: '0 auto 0.35rem' }} />
                <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-soft-ivory)' }}>
                  Atelier Guarantee
                </span>
                <span style={{ fontSize: '0.625rem', color: 'var(--color-muted-grey)' }}>14-Day Size Exchange</span>
              </div>
            </div>

            {/* Accordion Tabs */}
            <div style={{ borderTop: '1px solid rgba(184, 121, 81, 0.2)', marginTop: '0.5rem' }}>
              {/* Details & Purity */}
              <div style={{ borderBottom: '1px solid rgba(184, 121, 81, 0.2)' }}>
                <button
                  style={{
                    width: '100%',
                    padding: '1.1rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8125rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    color: 'var(--color-soft-ivory)'
                  }}
                  onClick={() => setActiveAccordion(activeAccordion === 'details' ? null : 'details')}
                >
                  <span>Details & Hallmarking</span>
                  <span style={{ color: 'var(--color-champagne)' }}>{activeAccordion === 'details' ? '−' : '+'}</span>
                </button>
                {activeAccordion === 'details' && (
                  <div style={{ paddingBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--color-muted-grey)', lineHeight: '1.75' }}>
                    <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {currentProduct.details.map((detail, idx) => (
                        <li key={idx}>{detail}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Craftsmanship & Care */}
              <div style={{ borderBottom: '1px solid rgba(184, 121, 81, 0.2)' }}>
                <button
                  style={{
                    width: '100%',
                    padding: '1.1rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8125rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    color: 'var(--color-soft-ivory)'
                  }}
                  onClick={() => setActiveAccordion(activeAccordion === 'care' ? null : 'care')}
                >
                  <span>Silver Care Guide</span>
                  <span style={{ color: 'var(--color-champagne)' }}>{activeAccordion === 'care' ? '−' : '+'}</span>
                </button>
                {activeAccordion === 'care' && (
                  <div style={{ paddingBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--color-muted-grey)', lineHeight: '1.75' }}>
                    <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {currentProduct.careGuide.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Shipping & Delivery */}
              <div style={{ borderBottom: '1px solid rgba(184, 121, 81, 0.2)' }}>
                <button
                  style={{
                    width: '100%',
                    padding: '1.1rem 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.8125rem',
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    fontWeight: 600,
                    color: 'var(--color-soft-ivory)'
                  }}
                  onClick={() => setActiveAccordion(activeAccordion === 'shipping' ? null : 'shipping')}
                >
                  <span>Shipping & Returns</span>
                  <span style={{ color: 'var(--color-champagne)' }}>{activeAccordion === 'shipping' ? '−' : '+'}</span>
                </button>
                {activeAccordion === 'shipping' && (
                  <div style={{ paddingBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--color-muted-grey)', lineHeight: '1.75' }}>
                    <p>{currentProduct.shippingInfo}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div style={{ marginTop: '7rem', paddingTop: '4rem', borderTop: '1px solid rgba(184, 121, 81, 0.2)' }}>
            <span className="eyebrow">COMPLEMENTARY DESIGNS</span>
            <h2 className="headline-editorial" style={{ fontSize: '2.25rem', marginBottom: '2.5rem' }}>
              You May Also <em>Admire.</em>
            </h2>
            <div className="product-grid" style={{ marginTop: '0' }}>
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Size Guide Modal */}
      <div className={`modal-backdrop ${sizeModalOpen ? 'open' : ''}`} onClick={() => setSizeModalOpen(false)}>
        <div className="modal-panel" style={{ padding: '2.5rem' }} onClick={(e) => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(184, 121, 81, 0.25)', paddingBottom: '1rem' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: 'var(--color-soft-ivory)' }}>Silver Jewellery Sizing Chart</h3>
            <button onClick={() => setSizeModalOpen(false)} aria-label="Close size guide" style={{ color: 'var(--color-soft-ivory)' }}>
              <X size={20} />
            </button>
          </div>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-muted-grey)', marginBottom: '1.5rem' }}>
            Our rings and cuffs adhere to standardized precision dimensions. If you are between sizes, we recommend selecting the larger size.
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--color-metallic-copper)', backgroundColor: '#100D0B', color: 'var(--color-soft-ivory)' }}>
                <th style={{ padding: '0.75rem' }}>US Size</th>
                <th style={{ padding: '0.75rem' }}>Inner Diameter (mm)</th>
                <th style={{ padding: '0.75rem' }}>Circumference (mm)</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid rgba(184, 121, 81, 0.15)', color: 'var(--color-muted-grey)' }}><td style={{ padding: '0.65rem' }}>US 6</td><td style={{ padding: '0.65rem' }}>16.5 mm</td><td style={{ padding: '0.65rem' }}>51.8 mm</td></tr>
              <tr style={{ borderBottom: '1px solid rgba(184, 121, 81, 0.15)', color: 'var(--color-muted-grey)' }}><td style={{ padding: '0.65rem' }}>US 7</td><td style={{ padding: '0.65rem' }}>17.3 mm</td><td style={{ padding: '0.65rem' }}>54.4 mm</td></tr>
              <tr style={{ borderBottom: '1px solid rgba(184, 121, 81, 0.15)', color: 'var(--color-muted-grey)' }}><td style={{ padding: '0.65rem' }}>US 8</td><td style={{ padding: '0.65rem' }}>18.1 mm</td><td style={{ padding: '0.65rem' }}>57.0 mm</td></tr>
              <tr style={{ borderBottom: '1px solid rgba(184, 121, 81, 0.15)', color: 'var(--color-muted-grey)' }}><td style={{ padding: '0.65rem' }}>US 9</td><td style={{ padding: '0.65rem' }}>19.0 mm</td><td style={{ padding: '0.65rem' }}>59.5 mm</td></tr>
              <tr style={{ borderBottom: '1px solid rgba(184, 121, 81, 0.15)', color: 'var(--color-muted-grey)' }}><td style={{ padding: '0.65rem' }}>US 10</td><td style={{ padding: '0.65rem' }}>19.8 mm</td><td style={{ padding: '0.65rem' }}>62.1 mm</td></tr>
              <tr style={{ borderBottom: '1px solid rgba(184, 121, 81, 0.15)', color: 'var(--color-muted-grey)' }}><td style={{ padding: '0.65rem' }}>US 11</td><td style={{ padding: '0.65rem' }}>20.6 mm</td><td style={{ padding: '0.65rem' }}>64.6 mm</td></tr>
            </tbody>
          </table>
          <button
            className="btn-primary"
            style={{ marginTop: '2rem', width: '100%' }}
            onClick={() => setSizeModalOpen(false)}
          >
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
