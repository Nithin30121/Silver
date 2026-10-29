import React, { useMemo, useState } from 'react';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import { toAccountError } from '../services/authService';
import { Search, ShoppingBag, Heart, User, Menu, X, ChevronDown, LayoutDashboard } from 'lucide-react';
import { motion } from 'motion/react';
import { drawerSlide, useBumpOnIncrease } from '../lib/motion';
import { LiveSilverRate } from './LiveSilverRate';
import { useCustomerSignOut } from './auth/authHelpers';

/** The bag or wishlist count beside its icon, which bumps when the number goes up. */
const CountBadge: React.FC<{ count: number; label: string }> = ({ count, label }) => {
  const badgeRef = useBumpOnIncrease<HTMLSpanElement>(count);
  return count > 0 ? <span ref={badgeRef} className="badge-count" aria-label={label}>{count}</span> : null;
};

export const Header: React.FC = () => {
  const { currentView, navigateTo, cartCount, wishlistCount, setIsCartOpen, setIsWishlistOpen, setIsSearchOpen, showToast, categories } = useShop();
  const { status, displayName, profile } = useAuth();
  const signOutCustomer = useCustomerSignOut();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const rootCategories = useMemo(() => {
    const audiences = categories.filter((category) => category.categoryType === 'audience');
    return audiences.length > 0 ? audiences : categories;
  }, [categories]);
  const isSignedIn = status === 'authenticated';
  // Only a convenience: the dashboard and its API check the admin role again on the server.
  const isAdmin = isSignedIn && profile?.role === 'admin';
  const navigateToCategory = (rootId: string, categoryId: string | 'all' = 'all') =>
    navigateTo('collection', { rootCategoryId: rootId, category: categoryId });
  const handleMobileNav = (action: () => void) => { action(); setMobileMenuOpen(false); };
  const handleMobileSignOut = async () => {
    setMobileMenuOpen(false);
    try { await signOutCustomer(); } catch (error) { showToast(toAccountError(error, 'Sign-out').message); }
  };

  return <>
    <div className="top-utility-bar" role="complementary" aria-label="Atelier market updates and services">
      <div className="container top-utility-container">
        <div className="top-utility-left"><LiveSilverRate /></div>
        <div className="top-utility-center"><span className="announcement-highlight">Signature Service:</span> Complimentary Insured Express Delivery &amp; Bespoke Velvet Box</div>
        <div className="top-utility-right"><span className="top-utility-assurance">Certified 925 Hallmark</span></div>
      </div>
    </div>

    <header className="header-wrapper">
      <div className="container header-container">
        <button className="mobile-menu-trigger" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle navigation menu">
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
        <a href="#home" className="brand-logo" onClick={(event) => { event.preventDefault(); navigateTo('home'); }}>SILVORA</a>

        <nav className="nav-container" aria-label="Main Navigation">
          <ul className="nav-links">
            <li className="nav-item">
              <a href="#new" className={`nav-link ${currentView === 'collection' ? 'active' : ''}`}
                onClick={(event) => { event.preventDefault(); navigateTo('collection', { category: 'all', rootCategoryId: 'all', gender: 'all' }); }}>NEW ARRIVALS</a>
            </li>
            {rootCategories.map((root) => <li className="nav-item" key={root.id}>
              <a href={`#${root.slug}`} className="nav-link" aria-haspopup="true"
                onClick={(event) => { event.preventDefault(); navigateToCategory(root.id); }}>
                {root.name.toUpperCase()} <ChevronDown size={13} style={{ strokeWidth: 1.8, marginTop: '1px' }} />
              </a>
              <div className="dropdown-menu">
                <a href={`#${root.slug}-all`} className="dropdown-link" onClick={(event) => { event.preventDefault(); navigateToCategory(root.id); }}>All {root.name}</a>
                {root.children.length > 0 && <div className="dropdown-divider" />}
                {root.children.map((child) => <a key={child.id} href={`#${root.slug}-${child.slug}`} className="dropdown-link"
                  onClick={(event) => { event.preventDefault(); navigateToCategory(root.id, child.id); }}>{child.name}</a>)}
              </div>
            </li>)}
            <li className="nav-item">
              <a href="#collections" className={`nav-link ${currentView === 'collection' ? 'active' : ''}`}
                onClick={(event) => { event.preventDefault(); navigateTo('collection', { category: 'all', rootCategoryId: 'all', gender: 'all' }); }}>COLLECTIONS</a>
            </li>
            <li className="nav-item"><a href="#story" className={`nav-link ${currentView === 'story' ? 'active' : ''}`} onClick={(event) => { event.preventDefault(); navigateTo('story'); }}>OUR STORY</a></li>
          </ul>
        </nav>

        <div className="nav-actions">
          <button className="nav-action-btn" onClick={() => setIsSearchOpen(true)} aria-label="Search catalog" title="Search"><Search size={19} style={{ strokeWidth: 1.6 }} /></button>
          <button className="nav-action-btn" onClick={() => setIsWishlistOpen(true)} aria-label="View wishlist" title="Saved Pieces">
            <Heart size={19} style={{ strokeWidth: 1.6 }} />
            <CountBadge count={wishlistCount} label={`${wishlistCount} items in wishlist`} />
          </button>
          {isAdmin && <a className="nav-action-btn" href="/admin" aria-label="Open the admin dashboard" title="Admin Dashboard"><LayoutDashboard size={19} style={{ strokeWidth: 1.6 }} /></a>}
          <button className="nav-action-btn" onClick={() => navigateTo(isSignedIn ? 'account' : 'login')}
            aria-label={isSignedIn ? `My account (signed in as ${displayName})` : 'Sign in or create an account'} title={isSignedIn ? 'My Account' : 'Sign In'}>
            <User size={19} style={{ strokeWidth: 1.6, color: isSignedIn ? 'var(--color-silver-highlight)' : undefined }} />
          </button>
          <button className="nav-action-btn" onClick={() => setIsCartOpen(true)} aria-label="View shopping bag" title="Shopping Bag">
            <ShoppingBag size={19} style={{ strokeWidth: 1.6 }} />
            <CountBadge count={cartCount} label={`${cartCount} items in bag`} />
          </button>
        </div>
      </div>
    </header>

    <div className={`drawer-backdrop ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)}>
      <motion.div className="drawer-panel" onClick={(event) => event.stopPropagation()}
        style={{ left: 0, right: 'auto' }} {...drawerSlide(mobileMenuOpen, 'left')}>
        <div className="drawer-header"><span className="brand-logo" style={{ fontSize: '1.25rem' }}>SILVORA</span><button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu"><X size={20} /></button></div>
        <div className="drawer-body" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <button className="btn-text" style={{ textAlign: 'left', width: '100%', fontSize: '0.9375rem' }} onClick={() => handleMobileNav(() => navigateTo('home'))}>Home</button>
            <button className="btn-text" style={{ textAlign: 'left', width: '100%', fontSize: '0.9375rem' }} onClick={() => handleMobileNav(() => navigateTo('collection', { category: 'all', rootCategoryId: 'all', gender: 'all' }))}>New Arrivals</button>
            {rootCategories.map((root) => <div key={root.id}>
              <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', paddingBottom: '0.5rem', borderBottom: '1px solid var(--color-border)', fontSize: '0.9375rem', textTransform: 'uppercase', fontWeight: 500, letterSpacing: '0.1em' }}
                onClick={() => setExpandedCategoryId(expandedCategoryId === root.id ? null : root.id)}>
                <span>{root.name}</span><ChevronDown size={16} style={{ transform: expandedCategoryId === root.id ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }} />
              </button>
              {expandedCategoryId === root.id && <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem 0 0.5rem 1rem' }}>
                <button className="btn-text" style={{ fontSize: '0.8125rem', textAlign: 'left' }} onClick={() => handleMobileNav(() => navigateToCategory(root.id))}>All {root.name}</button>
                {root.children.map((child) => <button key={child.id} className="btn-text" style={{ fontSize: '0.8125rem', textAlign: 'left' }} onClick={() => handleMobileNav(() => navigateToCategory(root.id, child.id))}>{child.name}</button>)}
              </div>}
            </div>)}
            <button className="btn-text" style={{ textAlign: 'left', width: '100%', fontSize: '0.9375rem' }} onClick={() => handleMobileNav(() => navigateTo('collection', { category: 'all', rootCategoryId: 'all', gender: 'all' }))}>Collections</button>
            <button className="btn-text" style={{ textAlign: 'left', width: '100%', fontSize: '0.9375rem' }} onClick={() => handleMobileNav(() => navigateTo('story'))}>Our Story</button>
            <button className="btn-text" style={{ textAlign: 'left', width: '100%', fontSize: '0.9375rem' }} onClick={() => handleMobileNav(() => navigateTo('care'))}>Jewellery Care</button>
            <button className="btn-text" style={{ textAlign: 'left', width: '100%', fontSize: '0.9375rem' }} onClick={() => handleMobileNav(() => navigateTo('shipping'))}>Shipping &amp; Returns</button>
            <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {isSignedIn ? <>
                <button className="btn-text" style={{ textAlign: 'left', width: '100%', fontSize: '0.9375rem' }} onClick={() => handleMobileNav(() => navigateTo('account'))}>My Account</button>
                {isAdmin && <a className="btn-text" href="/admin" style={{ textAlign: 'left', width: '100%', fontSize: '0.9375rem' }}>Admin Dashboard</a>}
                <button className="btn-text" style={{ textAlign: 'left', width: '100%', fontSize: '0.9375rem' }} onClick={handleMobileSignOut}>Sign Out</button>
              </> : <>
                <button className="btn-text" style={{ textAlign: 'left', width: '100%', fontSize: '0.9375rem' }} onClick={() => handleMobileNav(() => navigateTo('login'))}>Sign In</button>
                <button className="btn-text" style={{ textAlign: 'left', width: '100%', fontSize: '0.9375rem' }} onClick={() => handleMobileNav(() => navigateTo('signup'))}>Create Account</button>
              </>}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  </>;
};
