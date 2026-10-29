import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { ProductCard } from './FeaturedProducts';
import { AnimatedModal } from './AnimatedModal';
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
  const { currentProduct, products, addToCart, isWishlisted, toggleWishlist, navigateTo, catalogueStatus } = useShop();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedSize, setSelectedSize] = useState<string>('Standard');
  const [quantity, setQuantity] = useState(1);
  const [activeAccordion, setActiveAccordion] = useState<'details' | 'care' | 'shipping' | null>('details');
  const [sizeModalOpen, setSizeModalOpen] = useState(false);

  React.useEffect(() => {
    if (currentProduct?.availableSizes?.[0]) {
      setSelectedSize(currentProduct.availableSizes[0]);
    }
    setActiveImageIndex(0);
    setQuantity(1);
  }, [currentProduct]);

  // Opened from its own address, the piece appears once the catalogue has loaded.
  if (!currentProduct && catalogueStatus === 'loading') {
    return (
      <div className="container" style={{ padding: '8rem 2rem', textAlign: 'center', backgroundColor: 'var(--color-black)' }}>
        <p className="auth-loading" style={{ justifyContent: 'center' }}><span className="auth-spinner" aria-hidden="true" /> Loading this piece…</p>
      </div>
    );
  }

  if (!currentProduct) {
    return (
      <div className="container" style={{ padding: '8rem 2rem', textAlign: 'center', backgroundColor: 'var(--color-black)' }}>
        <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: 'var(--color-text)' }}>Piece Not Found</h2>
        <p style={{ marginTop: '1rem', color: 'var(--color-text-muted)' }}>The silver ornament you requested could not be located.</p>
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
    <div style={{ backgroundColor: 'var(--color-black)', minHeight: '90vh', paddingBottom: '6rem' }}>
      {/* Breadcrumb Navigation */}
      <div className="container" style={{ paddingTop: '2.5rem', paddingBottom: '1.5rem' }}>
        <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--color-text-muted)' }}>
          <a href="#home" onClick={(e) => { e.preventDefault(); navigateTo('home'); }} style={{ color: 'var(--color-text-muted)' }}>Home</a>
          <ChevronRight size={12} style={{ color: 'var(--color-silver-deep)' }} />
          <a
            href="#collection"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('collection', { category: currentProduct.categoryIds[0] ?? 'all', gender: 'all' });
            }}
            style={{ color: 'var(--color-text-muted)' }}
          >
            {currentProduct.category}
          </a>
          <ChevronRight size={12} style={{ color: 'var(--color-silver-deep)' }} />
          <span style={{ color: 'var(--color-text)', fontWeight: 600 }}>{currentProduct.name}</span>
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
                backgroundColor: 'var(--color-ink)',
                border: '1px solid rgba(143, 146, 153, 0.28)',
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
                      border: activeImageIndex === idx ? '2px solid var(--color-silver-deep)' : '1px solid rgba(143, 146, 153, 0.25)',
                      backgroundColor: 'var(--color-ink)',
                      opacity: activeImageIndex === idx ? 1 : 0.6,
                      boxShadow: activeImageIndex === idx ? '0 0 15px rgba(143, 146, 153, 0.25)' : 'none',
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
              <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem, 3.5vw, 3rem)', lineHeight: '1.15', marginBottom: '0.5rem', color: 'var(--color-text)' }}>
                {currentProduct.name}
              </h1>
              <p style={{ fontSize: '0.9375rem', color: 'var(--color-text-muted)' }}>
                {currentProduct.subtitle}
              </p>
            </div>

            {/* Price Row */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', paddingBottom: '1.5rem', borderBottom: '1px solid rgba(143, 146, 153, 0.2)' }}>
              <span style={{ fontSize: '1.65rem', fontWeight: 600, color: 'var(--color-silver-highlight)' }}>
                {formattedPrice}
              </span>
              {currentProduct.originalPrice && (
                <span style={{ fontSize: '1.1rem', color: 'var(--color-text-muted)', textDecoration: 'line-through' }}>
                  ₹{currentProduct.originalPrice.toLocaleString('en-IN')}
                </span>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--color-silver-accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Includes GST & Insured Transit
              </span>
            </div>

            {/* Short Description */}
            <p style={{ fontSize: '0.95rem', lineHeight: '1.75', color: 'var(--color-text-muted)' }}>
              {currentProduct.description}
            </p>

            {/* Verified Specifications Snippet */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem', padding: '1.25rem', backgroundColor: '#0E0F11', border: '1px solid rgba(143, 146, 153, 0.22)', fontSize: '0.8125rem' }}>
              <div>
                <span style={{ color: 'var(--color-silver-accent)', display: 'block', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.2rem' }}>Material</span>
                <strong style={{ color: 'var(--color-text)' }}>{currentProduct.material}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-silver-accent)', display: 'block', fontSize: '0.6875rem', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.2rem' }}>Weight</span>
                <strong style={{ color: 'var(--color-text)' }}>{currentProduct.weightGrams ? `${currentProduct.weightGrams}g` : 'Standard Weight'}</strong>
              </div>
            </div>

            {/* Size Selector (If Available) */}
            {currentProduct.availableSizes && currentProduct.availableSizes.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--color-text)' }}>
                    Select Size: <strong style={{ color: 'var(--color-silver-highlight)' }}>{selectedSize}</strong>
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
                        border: selectedSize === sz ? '1px solid var(--color-silver-deep)' : '1px solid rgba(143, 146, 153, 0.25)',
                        backgroundColor: selectedSize === sz ? 'rgba(26, 27, 30, 0.95)' : 'rgba(14, 15, 17, 0.6)',
                        color: selectedSize === sz ? 'var(--color-silver-highlight)' : 'var(--color-text-muted)',
                        boxShadow: selectedSize === sz ? '0 0 12px rgba(143, 146, 153, 0.2)' : 'none',
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
            <div className="product-buy-row" style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
              {/* Quantity */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid rgba(143, 146, 153, 0.3)',
                  backgroundColor: '#0E0F11',
                  height: '52px'
                }}
              >
                <button
                  style={{ width: '40px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text)' }}
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  aria-label="Decrease quantity"
                >
                  <Minus size={14} />
                </button>
                <span style={{ width: '36px', textAlign: 'center', fontWeight: 600, fontSize: '0.875rem', color: 'var(--color-text)' }}>
                  {quantity}
                </span>
                <button
                  style={{ width: '40px', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text)' }}
                  onClick={() => setQuantity(quantity + 1)}
                  aria-label="Increase quantity"
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* Add to Bag Primary CTA */}
              <button
                className="btn-primary product-add-button"
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
                  border: '1px solid rgba(143, 146, 153, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: wishlisted ? '#1b1c1f' : '#0E0F11',
                  color: wishlisted ? 'var(--color-silver-accent)' : 'var(--color-text)',
                  transition: 'var(--transition-fast)'
                }}
                onClick={() => toggleWishlist(currentProduct.id)}
                aria-label="Wishlist toggle"
              >
                <Heart
                  size={18}
                  style={{
                    fill: wishlisted ? 'var(--color-silver-accent)' : 'none',
                    strokeWidth: 1.8
                  }}
                />
              </button>
            </div>

            {/* Value Guarantees */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', paddingTop: '1.25rem', borderTop: '1px solid rgba(143, 146, 153, 0.2)' }}>
              <div style={{ textAlign: 'center' }}>
                <ShieldCheck size={18} style={{ color: 'var(--color-silver-accent)', margin: '0 auto 0.35rem' }} />
                <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text)' }}>
                  BIS Hallmarked
                </span>
                <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>Authentic 92.5% Silver</span>
              </div>

              <div style={{ textAlign: 'center' }}>
                <Truck size={18} style={{ color: 'var(--color-silver-accent)', margin: '0 auto 0.35rem' }} />
                <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text)' }}>
                  Express Transit
                </span>
                <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>Insured 2–4 Business Days</span>
              </div>

              <div style={{ textAlign: 'center' }}>
                <Sparkles size={18} style={{ color: 'var(--color-silver-accent)', margin: '0 auto 0.35rem' }} />
                <span style={{ display: 'block', fontSize: '0.6875rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text)' }}>
                  Atelier Guarantee
                </span>
                <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>14-Day Size Exchange</span>
              </div>
            </div>

            {/* Accordion Tabs */}
            <div style={{ borderTop: '1px solid rgba(143, 146, 153, 0.2)', marginTop: '0.5rem' }}>
              {/* Details & Purity */}
              <div style={{ borderBottom: '1px solid rgba(143, 146, 153, 0.2)' }}>
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
                    color: 'var(--color-text)'
                  }}
                  onClick={() => setActiveAccordion(activeAccordion === 'details' ? null : 'details')}
                >
                  <span>Details & Hallmarking</span>
                  <span style={{ color: 'var(--color-silver-highlight)' }}>{activeAccordion === 'details' ? '−' : '+'}</span>
                </button>
                {activeAccordion === 'details' && (
                  <div style={{ paddingBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: '1.75' }}>
                    <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {currentProduct.details.map((detail, idx) => (
                        <li key={idx}>{detail}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Craftsmanship & Care */}
              <div style={{ borderBottom: '1px solid rgba(143, 146, 153, 0.2)' }}>
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
                    color: 'var(--color-text)'
                  }}
                  onClick={() => setActiveAccordion(activeAccordion === 'care' ? null : 'care')}
                >
                  <span>Silver Care Guide</span>
                  <span style={{ color: 'var(--color-silver-highlight)' }}>{activeAccordion === 'care' ? '−' : '+'}</span>
                </button>
                {activeAccordion === 'care' && (
                  <div style={{ paddingBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: '1.75' }}>
                    <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {currentProduct.careGuide.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Shipping & Delivery */}
              <div style={{ borderBottom: '1px solid rgba(143, 146, 153, 0.2)' }}>
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
                    color: 'var(--color-text)'
                  }}
                  onClick={() => setActiveAccordion(activeAccordion === 'shipping' ? null : 'shipping')}
                >
                  <span>Shipping & Returns</span>
                  <span style={{ color: 'var(--color-silver-highlight)' }}>{activeAccordion === 'shipping' ? '−' : '+'}</span>
                </button>
                {activeAccordion === 'shipping' && (
                  <div style={{ paddingBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: '1.75' }}>
                    <p>{currentProduct.shippingInfo}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div style={{ marginTop: '7rem', paddingTop: '4rem', borderTop: '1px solid rgba(143, 146, 153, 0.2)' }}>
            <span className="eyebrow">COMPLEMENTARY DESIGNS</span>
            <h2 className="headline-editorial" style={{ fontSize: '2.25rem', marginBottom: '2.5rem' }}>
              You May Also <em>Admire.</em>
            </h2>
            <div className="product-grid" style={{ marginTop: '0' }}>
              {relatedProducts.map((p, index) => (
                <ProductCard key={p.id} product={p} index={index} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Size Guide Modal */}
      <AnimatedModal open={sizeModalOpen} onClose={() => setSizeModalOpen(false)} panelStyle={{ padding: '2.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid rgba(143, 146, 153, 0.25)', paddingBottom: '1rem' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.75rem', color: 'var(--color-text)' }}>Silver Jewellery Sizing Chart</h3>
          <button onClick={() => setSizeModalOpen(false)} aria-label="Close size guide" style={{ color: 'var(--color-text)' }}>
            <X size={20} />
          </button>
        </div>
        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>
          Our rings and cuffs adhere to standardized precision dimensions. If you are between sizes, we recommend selecting the larger size.
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--color-silver-deep)', backgroundColor: '#0E0F11', color: 'var(--color-text)' }}>
              <th style={{ padding: '0.75rem' }}>US Size</th>
              <th style={{ padding: '0.75rem' }}>Inner Diameter (mm)</th>
              <th style={{ padding: '0.75rem' }}>Circumference (mm)</th>
            </tr>
          </thead>
          <tbody>
            <tr style={{ borderBottom: '1px solid rgba(143, 146, 153, 0.15)', color: 'var(--color-text-muted)' }}><td style={{ padding: '0.65rem' }}>US 6</td><td style={{ padding: '0.65rem' }}>16.5 mm</td><td style={{ padding: '0.65rem' }}>51.8 mm</td></tr>
            <tr style={{ borderBottom: '1px solid rgba(143, 146, 153, 0.15)', color: 'var(--color-text-muted)' }}><td style={{ padding: '0.65rem' }}>US 7</td><td style={{ padding: '0.65rem' }}>17.3 mm</td><td style={{ padding: '0.65rem' }}>54.4 mm</td></tr>
            <tr style={{ borderBottom: '1px solid rgba(143, 146, 153, 0.15)', color: 'var(--color-text-muted)' }}><td style={{ padding: '0.65rem' }}>US 8</td><td style={{ padding: '0.65rem' }}>18.1 mm</td><td style={{ padding: '0.65rem' }}>57.0 mm</td></tr>
            <tr style={{ borderBottom: '1px solid rgba(143, 146, 153, 0.15)', color: 'var(--color-text-muted)' }}><td style={{ padding: '0.65rem' }}>US 9</td><td style={{ padding: '0.65rem' }}>19.0 mm</td><td style={{ padding: '0.65rem' }}>59.5 mm</td></tr>
            <tr style={{ borderBottom: '1px solid rgba(143, 146, 153, 0.15)', color: 'var(--color-text-muted)' }}><td style={{ padding: '0.65rem' }}>US 10</td><td style={{ padding: '0.65rem' }}>19.8 mm</td><td style={{ padding: '0.65rem' }}>62.1 mm</td></tr>
            <tr style={{ borderBottom: '1px solid rgba(143, 146, 153, 0.15)', color: 'var(--color-text-muted)' }}><td style={{ padding: '0.65rem' }}>US 11</td><td style={{ padding: '0.65rem' }}>20.6 mm</td><td style={{ padding: '0.65rem' }}>64.6 mm</td></tr>
          </tbody>
        </table>
        <button
          className="btn-primary"
          style={{ marginTop: '2rem', width: '100%' }}
          onClick={() => setSizeModalOpen(false)}
        >
          Understood
        </button>
      </AnimatedModal>
    </div>
  );
};
