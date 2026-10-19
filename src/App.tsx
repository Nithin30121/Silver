import React from 'react';
import { ShopProvider, useShop } from './context/ShopContext';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { CollectionGrid } from './components/CollectionGrid';
import { FeaturedProducts } from './components/FeaturedProducts';
import { CatalogPage } from './components/CatalogPage';
import { ProductDetailPage } from './components/ProductDetailPage';
import { StoryPage } from './components/StoryPage';
import { CarePage } from './components/CarePage';
import { ShippingPage, ContactPage, FAQPage } from './components/SupportingPages';
import { CartDrawer } from './components/CartDrawer';
import { WishlistDrawer } from './components/WishlistDrawer';
import { SearchModal } from './components/SearchModal';
import { QuickViewModal } from './components/QuickViewModal';
import { Footer } from './components/Footer';
import { Sparkles, ShieldCheck, RefreshCw, Check } from 'lucide-react';

const MainContent: React.FC = () => {
  const { currentView, toastMessage } = useShop();

  return (
    <>
      <Header />

      <main style={{ flex: 1 }}>
        {/* Dynamic Page Router */}
        {currentView === 'home' && (
          <>
            <Hero />
            <CollectionGrid />
            <FeaturedProducts />

            {/* Editorial Brand Assurance Banner */}
            <section style={{ backgroundColor: 'var(--color-warm-ivory)', borderTop: '1px solid var(--color-border)', padding: '4.5rem 0' }}>
              <div className="container">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2.5rem', textAlign: 'center' }}>
                  <div style={{ padding: '1rem' }}>
                    <ShieldCheck size={26} style={{ color: 'var(--color-champagne)', margin: '0 auto 0.75rem' }} />
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', marginBottom: '0.4rem' }}>
                      Certified 925 Hallmark
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted-grey)', lineHeight: '1.6' }}>
                      Each piece bears the genuine 925 hallmark stamp, guaranteeing 92.5% pure silver content.
                    </p>
                  </div>

                  <div style={{ padding: '1rem' }}>
                    <Sparkles size={26} style={{ color: 'var(--color-champagne)', margin: '0 auto 0.75rem' }} />
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', marginBottom: '0.4rem' }}>
                      Anti-Tarnish Rhodium Finish
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted-grey)', lineHeight: '1.6' }}>
                      Shielded with an invisible micro-barrier that preserves brilliant reflectivity against ambient oxidation.
                    </p>
                  </div>

                  <div style={{ padding: '1rem' }}>
                    <RefreshCw size={26} style={{ color: 'var(--color-champagne)', margin: '0 auto 0.75rem' }} />
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', marginBottom: '0.4rem' }}>
                      Complimentary 14-Day Exchange
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-muted-grey)', lineHeight: '1.6' }}>
                      Insured doorstep delivery and hassle-free size exchanges for total confidence in your selection.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {currentView === 'collection' && <CatalogPage genderScope="all" />}
        {currentView === 'men' && <CatalogPage genderScope="men" />}
        {currentView === 'women' && <CatalogPage genderScope="women" />}
        {currentView === 'product' && <ProductDetailPage />}
        {currentView === 'story' && <StoryPage />}
        {currentView === 'care' && <CarePage />}
        {currentView === 'shipping' && <ShippingPage />}
        {currentView === 'contact' && <ContactPage />}
        {currentView === 'faq' && <FAQPage />}
      </main>

      {/* Global Drawers & Modals */}
      <CartDrawer />
      <WishlistDrawer />
      <SearchModal />
      <QuickViewModal />

      {/* Global Notification Toast */}
      {toastMessage && (
        <div className="toast-banner" role="status" aria-live="polite">
          <Check size={16} style={{ color: 'var(--color-champagne)' }} />
          <span>{toastMessage}</span>
        </div>
      )}

      <Footer />
    </>
  );
};

export const App: React.FC = () => {
  return (
    <ShopProvider>
      <MainContent />
    </ShopProvider>
  );
};

export default App;
