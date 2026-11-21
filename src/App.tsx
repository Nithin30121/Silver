import React from 'react';
import { ShopProvider, useShop } from './context/ShopContext';
import { AuthProvider } from './context/AuthContext';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { SilverStory } from './components/SilverStory';
import { FeaturedProducts } from './components/FeaturedProducts';
import { CustomDesignBanner } from './components/CustomDesignBanner';
import { CatalogPage } from './components/CatalogPage';
import { ProductDetailPage } from './components/ProductDetailPage';
import { CarePage } from './components/CarePage';
import { HallmarkPage } from './components/HallmarkPage';
import { CustomDesignPage } from './components/CustomDesignPage';
import { ShippingPage, ReturnPolicyPage, ContactPage, FAQPage } from './components/SupportingPages';
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
import { Sparkles, ShieldCheck, RotateCcw, ArrowRight, Check } from 'lucide-react';

const MainContent: React.FC = () => {
  const { currentView, toastMessage, navigateTo } = useShop();

  return (
    <>
      <BrandIntro />
      <Header />

      <main style={{ flex: 1, backgroundColor: 'var(--color-black)' }}>
        {/* Dynamic Page Router */}
        {currentView === 'home' && (
          <>
            <Hero />
            <SilverStory />
            <GenderCategories />
            <FeaturedProducts />
            <CustomDesignBanner />

            {/* Editorial Brand Assurance Banner. Phones show the short titles and lines; larger screens the full ones. */}
            <section className="assurance-section">
              <div className="container">
                <div className="assurance-grid">
                  <motion.a href="/hallmark" className="assurance-card assurance-link" {...revealOnScroll()}
                    onClick={(event) => { event.preventDefault(); navigateTo('hallmark'); }}>
                    <ShieldCheck size={28} className="assurance-icon" aria-hidden="true" />
                    <h3 className="assurance-title">
                      <span className="assurance-long">Certified 925 Hallmark</span><span className="assurance-short">925 Hallmark</span>
                    </h3>
                    <p className="assurance-text">
                      <span className="assurance-long">Each piece bears the genuine 925 hallmark stamp, guaranteeing 92.5% pure silver content.</span>
                      <span className="assurance-short">Certified purity (92.5% Silver)</span>
                    </p>
                    <span className="assurance-link-cue">About the hallmark <ArrowRight size={12} aria-hidden="true" /></span>
                  </motion.a>

                  <motion.a href="/care" className="assurance-card assurance-link" {...revealOnScroll(0.1)}
                    onClick={(event) => { event.preventDefault(); navigateTo('care'); }}>
                    <Sparkles size={28} className="assurance-icon" aria-hidden="true" />
                    <h3 className="assurance-title">
                      <span className="assurance-long">Jewellery Care Guide</span><span className="assurance-short">Care Guide</span>
                    </h3>
                    <p className="assurance-text">
                      <span className="assurance-long">At SILVORA LUXE, we believe every piece of jewellery deserves to shine for a lifetime.</span>
                      <span className="assurance-short">Keep your jewellery radiant for longer.</span>
                    </p>
                    <span className="assurance-link-cue">Read the guide <ArrowRight size={12} aria-hidden="true" /></span>
                  </motion.a>

                  <motion.a href="/return-policy" className="assurance-card assurance-link" {...revealOnScroll(0.2)}
                    onClick={(event) => { event.preventDefault(); navigateTo('returns'); }}>
                    <RotateCcw size={28} className="assurance-icon" aria-hidden="true" />
                    <h3 className="assurance-title">Return Policy</h3>
                    <p className="assurance-text">
                      <span className="assurance-long">To protect the authenticity of our genuine 925 sterling silver products, all return requests are personally reviewed.</span>
                      <span className="assurance-short">Hassle-free returns with authenticity check.</span>
                    </p>
                    <span className="assurance-link-cue">Read the policy <ArrowRight size={12} aria-hidden="true" /></span>
                  </motion.a>
                </div>
              </div>
            </section>
          </>
        )}

        {currentView === 'collection' && <CatalogPage />}
        {currentView === 'men' && <CatalogPage />}
        {currentView === 'women' && <CatalogPage />}
        {currentView === 'product' && <ProductDetailPage />}
        {currentView === 'care' && <CarePage />}
        {currentView === 'hallmark' && <HallmarkPage />}
        {currentView === 'custom' && <CustomDesignPage />}
        {currentView === 'shipping' && <ShippingPage />}
        {currentView === 'returns' && <ReturnPolicyPage />}
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
