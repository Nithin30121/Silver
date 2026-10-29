import React from 'react';
import { ShopProvider, useShop } from './context/ShopContext';
import { AuthProvider } from './context/AuthContext';
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
import { BrandIntro } from './components/BrandIntro';
import { GenderCategories } from './components/GenderCategories';
import { LoginPage } from './components/auth/LoginPage';
import { SignupPage } from './components/auth/SignupPage';
import { ForgotPasswordPage } from './components/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './components/auth/ResetPasswordPage';
import { AccountPage } from './components/auth/AccountPage';
import { AuthFlowCoordinator } from './components/auth/AuthFlowCoordinator';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { luxeEase, revealOnScroll } from './lib/motion';
import { Sparkles, ShieldCheck, RefreshCw, Check } from 'lucide-react';

const MainContent: React.FC = () => {
  const { currentView, toastMessage } = useShop();

  return (
    <>
      <BrandIntro />
      <Header />

      <main style={{ flex: 1, backgroundColor: 'var(--color-black)' }}>
        {/* Dynamic Page Router */}
        {currentView === 'home' && (
          <>
            <Hero />
            <GenderCategories />
            <FeaturedProducts />
            <CollectionGrid />

            {/* Editorial Brand Assurance Banner */}
            <section style={{ backgroundColor: '#0b0b0d', borderTop: '1px solid rgba(143, 146, 153, 0.2)', borderBottom: '1px solid rgba(143, 146, 153, 0.15)', padding: '5rem 0' }}>
              <div className="container">
                <div className="assurance-grid">
                  <motion.div style={{ padding: '1.5rem 1rem', backgroundColor: 'rgba(14, 15, 17, 0.6)', border: '1px solid rgba(143, 146, 153, 0.15)' }} {...revealOnScroll()}>
                    <ShieldCheck size={28} style={{ color: 'var(--color-silver-accent)', margin: '0 auto 0.85rem' }} />
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', marginBottom: '0.45rem', color: 'var(--color-text)' }}>
                      Certified 925 Hallmark
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', lineHeight: '1.65' }}>
                      Each piece bears the genuine 925 hallmark stamp, guaranteeing 92.5% pure silver content.
                    </p>
                  </motion.div>

                  <motion.div style={{ padding: '1.5rem 1rem', backgroundColor: 'rgba(14, 15, 17, 0.6)', border: '1px solid rgba(143, 146, 153, 0.15)' }} {...revealOnScroll(0.1)}>
                    <Sparkles size={28} style={{ color: 'var(--color-silver-accent)', margin: '0 auto 0.85rem' }} />
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', marginBottom: '0.45rem', color: 'var(--color-text)' }}>
                      Anti-Tarnish Rhodium Finish
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', lineHeight: '1.65' }}>
                      Shielded with an invisible micro-barrier that preserves brilliant reflectivity against ambient oxidation.
                    </p>
                  </motion.div>

                  <motion.div style={{ padding: '1.5rem 1rem', backgroundColor: 'rgba(14, 15, 17, 0.6)', border: '1px solid rgba(143, 146, 153, 0.15)' }} {...revealOnScroll(0.2)}>
                    <RefreshCw size={28} style={{ color: 'var(--color-silver-accent)', margin: '0 auto 0.85rem' }} />
                    <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', marginBottom: '0.45rem', color: 'var(--color-text)' }}>
                      Complimentary 14-Day Exchange
                    </h3>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', lineHeight: '1.65' }}>
                      Insured doorstep delivery and hassle-free size exchanges for total confidence in your selection.
                    </p>
                  </motion.div>
                </div>
              </div>
            </section>
          </>
        )}

        {currentView === 'collection' && <CatalogPage />}
        {currentView === 'men' && <CatalogPage />}
        {currentView === 'women' && <CatalogPage />}
        {currentView === 'product' && <ProductDetailPage />}
        {currentView === 'story' && <StoryPage />}
        {currentView === 'care' && <CarePage />}
        {currentView === 'shipping' && <ShippingPage />}
        {currentView === 'contact' && <ContactPage />}
        {currentView === 'faq' && <FAQPage />}

        {/* Customer Accounts */}
        {currentView === 'login' && <LoginPage />}
        {currentView === 'signup' && <SignupPage />}
        {currentView === 'forgot-password' && <ForgotPasswordPage />}
        {currentView === 'reset-password' && <ResetPasswordPage />}
        {currentView === 'account' && <AccountPage />}
      </main>

      <AuthFlowCoordinator />

      {/* Global Drawers & Modals */}
      <CartDrawer />
      <WishlistDrawer />
      <SearchModal />
      <QuickViewModal />

      {/* Global Notification Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key={toastMessage}
            className="toast-banner"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.3, ease: luxeEase }}
          >
            <Check size={16} style={{ color: 'var(--color-silver-accent)' }} />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <Footer />
    </>
  );
};

export const App: React.FC = () => {
  const isAdminRoute = window.location.pathname.replace(/\/+$/, '') === '/admin';
  return (
    <MotionConfig reducedMotion="user">
      <ShopProvider>
        <AuthProvider>
          {isAdminRoute ? <AdminDashboard /> : <MainContent />}
        </AuthProvider>
      </ShopProvider>
    </MotionConfig>
  );
};

export default App;
