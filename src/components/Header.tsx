import React, { useMemo, useState } from 'react';
import { useShop } from '../context/ShopContext';
import { useAuth } from '../context/AuthContext';
import { toAccountError } from '../services/authService';
import { Search, ShoppingBag, Heart, User, Menu, X, ChevronDown, LayoutDashboard, LogIn, LogOut, UserPlus } from 'lucide-react';
import { motion } from 'motion/react';
import { drawerSlide, useBumpOnIncrease } from '../lib/motion';
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
            <li className="nav-item"><a href="/custom-design" className={`nav-link ${currentView === 'custom' ? 'active' : ''}`} onClick={(event) => { event.preventDefault(); navigateTo('custom'); }}>CUSTOM DESIGN</a></li>
          </ul>
        </nav>

        <div className="nav-actions">
          <button className="nav-action-btn" onClick={() => setIsSearchOpen(true)} aria-label="Search catalog" title="Search"><Search size={19} style={{ strokeWidth: 1.6 }} /></button>
          <button className="nav-action-btn is-wishlist" onClick={() => setIsWishlistOpen(true)} aria-label="View wishlist" title="Saved Pieces">
            <Heart size={19} style={{ strokeWidth: 1.6 }} />
            <CountBadge count={wishlistCount} label={`${wishlistCount} items in wishlist`} />
          </button>
          {isAdmin && <a className="nav-action-btn is-admin" href="/admin" aria-label="Open the admin dashboard" title="Admin Dashboard"><LayoutDashboard size={19} style={{ strokeWidth: 1.6 }} /></a>}
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
      <motion.div className="drawer-panel mobile-nav-drawer" onClick={(event) => event.stopPropagation()}
        style={{ left: 0, right: 'auto' }} {...drawerSlide(mobileMenuOpen, 'left')}>
        <div className="drawer-header mobile-nav-head">
          <span className="mobile-nav-brand">SILVORA</span>
          <button className="mobile-nav-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu"><X size={22} strokeWidth={1.6} /></button>
        </div>
        {/* The menu itself sits on ivory: the shop's pages in a serif list, then the account links with small icons. */}
        <nav className="drawer-body mobile-nav-body" aria-label="Menu">
          <ul className="mobile-nav-list">
            <li><button className="mobile-nav-link" onClick={() => handleMobileNav(() => navigateTo('home'))}>Home</button></li>
            <li><button className="mobile-nav-link" onClick={() => handleMobileNav(() => navigateTo('collection', { category: 'all', rootCategoryId: 'all', gender: 'all' }))}>New Arrivals</button></li>
            {rootCategories.map((root) => {
              const open = expandedCategoryId === root.id;
              return <li key={root.id}>
                <button className="mobile-nav-link" aria-expanded={open} onClick={() => setExpandedCategoryId(open ? null : root.id)}>
                  <span>{root.name}</span><ChevronDown size={18} strokeWidth={1.6} className="mobile-nav-chevron" aria-hidden="true" />
                </button>
                {open && <ul className="mobile-nav-sub">
                  <li><button className="mobile-nav-sublink" onClick={() => handleMobileNav(() => navigateToCategory(root.id))}>All {root.name}</button></li>
                  {root.children.map((child) => <li key={child.id}>
                    <button className="mobile-nav-sublink" onClick={() => handleMobileNav(() => navigateToCategory(root.id, child.id))}>{child.name}</button>
                  </li>)}
                </ul>}
              </li>;
            })}
            <li><button className="mobile-nav-link" onClick={() => handleMobileNav(() => navigateTo('collection', { category: 'all', rootCategoryId: 'all', gender: 'all' }))}>Collections</button></li>
            <li><button className="mobile-nav-link" onClick={() => handleMobileNav(() => navigateTo('custom'))}>Custom Design</button></li>
            <li><button className="mobile-nav-link" onClick={() => handleMobileNav(() => navigateTo('care'))}>Jewellery Care</button></li>
            <li><button className="mobile-nav-link" onClick={() => handleMobileNav(() => navigateTo('shipping'))}>Shipping &amp; Returns</button></li>
            {/* On phones the footer is kept short, so contact and questions live here too. */}
            <li><button className="mobile-nav-link" onClick={() => handleMobileNav(() => navigateTo('contact'))}>Contact Us</button></li>
            <li><button className="mobile-nav-link" onClick={() => handleMobileNav(() => navigateTo('faq'))}>FAQ</button></li>
          </ul>

          <p className="mobile-nav-label">Your account</p>
          <ul className="mobile-nav-list is-account">
            <li>
              <button className="mobile-nav-link" onClick={() => handleMobileNav(() => setIsWishlistOpen(true))}>
                <Heart size={18} strokeWidth={1.6} aria-hidden="true" /><span>Wishlist</span>
                {wishlistCount > 0 && <span className="mobile-nav-count" aria-label={`${wishlistCount} saved`}>{wishlistCount}</span>}
              </button>
            </li>
            {isSignedIn ? <>
              <li><button className="mobile-nav-link" onClick={() => handleMobileNav(() => navigateTo('account'))}><User size={18} strokeWidth={1.6} aria-hidden="true" /><span>My Account</span></button></li>
              {isAdmin && <li><a className="mobile-nav-link" href="/admin"><LayoutDashboard size={18} strokeWidth={1.6} aria-hidden="true" /><span>Admin Dashboard</span></a></li>}
              <li><button className="mobile-nav-link" onClick={handleMobileSignOut}><LogOut size={18} strokeWidth={1.6} aria-hidden="true" /><span>Sign Out</span></button></li>
            </> : <>
              <li><button className="mobile-nav-link" onClick={() => handleMobileNav(() => navigateTo('login'))}><LogIn size={18} strokeWidth={1.6} aria-hidden="true" /><span>Sign In</span></button></li>
              <li><button className="mobile-nav-link" onClick={() => handleMobileNav(() => navigateTo('signup'))}><UserPlus size={18} strokeWidth={1.6} aria-hidden="true" /><span>Create Account</span></button></li>
            </>}
          </ul>
        </nav>
      </motion.div>
    </div>
  </>;
};
