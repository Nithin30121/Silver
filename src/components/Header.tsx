import React, { useState } from 'react';
import { useShop } from '../context/ShopContext';
import { Search, ShoppingBag, Heart, Menu, X, ChevronDown } from 'lucide-react';

export const Header: React.FC = () => {
  const {
    currentView,
    navigateTo,
    cartCount,
    wishlistCount,
    setIsCartOpen,
    setIsWishlistOpen,
    setIsSearchOpen
  } = useShop();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileMenExpanded, setMobileMenExpanded] = useState(false);
  const [mobileWomenExpanded, setMobileWomenExpanded] = useState(false);

  const handleMobileNav = (action: () => void) => {
    action();
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Top Subtle Announcement */}
      <div className="announcement-bar">
        <span>Complimentary Insured Express Delivery & Signature Silver Box on All Orders</span>
      </div>

      <header className="header-wrapper">
        <div className="container header-container">
          {/* Mobile Menu Button */}
          <button
            className="mobile-menu-trigger"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Left: Brand Monogram / Logo */}
          <a
            href="#home"
            className="brand-logo"
            onClick={(e) => {
              e.preventDefault();
              navigateTo('home');
            }}
          >
            SILVESTO <span className="brand-logo-mark">LUXE</span>
          </a>

          {/* Centre: Main Navigation */}
          <nav className="nav-container" aria-label="Main Navigation">
            <ul className="nav-links">
              <li className="nav-item">
                <a
                  href="#new"
                  className={`nav-link ${currentView === 'collection' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('collection', { category: 'all', gender: 'all' });
                  }}
                >
                  New Arrivals
                </a>
              </li>

              {/* Men with Dropdown */}
              <li className="nav-item">
                <a
                  href="#men"
                  className={`nav-link ${currentView === 'men' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('men', { gender: 'men', category: 'all' });
                  }}
                  aria-haspopup="true"
                >
                  Men
                  <ChevronDown size={13} style={{ strokeWidth: 1.8, marginTop: '1px' }} />
                </a>

                <div className="dropdown-menu">
                  <a
                    href="#men-all"
                    className="dropdown-link"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo('men', { gender: 'men', category: 'all' });
                    }}
                  >
                    View All Men's Jewellery
                  </a>
                  <div className="dropdown-divider" />
                  <a
                    href="#men-rings"
                    className="dropdown-link"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo('men', { gender: 'men', category: 'rings' });
                    }}
                  >
                    Rings
                  </a>
                  <a
                    href="#men-bracelets"
                    className="dropdown-link"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo('men', { gender: 'men', category: 'bracelets' });
                    }}
                  >
                    Bracelets
                  </a>
                </div>
              </li>

              {/* Women with Dropdown */}
              <li className="nav-item">
                <a
                  href="#women"
                  className={`nav-link ${currentView === 'women' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('women', { gender: 'women', category: 'all' });
                  }}
                  aria-haspopup="true"
                >
                  Women
                  <ChevronDown size={13} style={{ strokeWidth: 1.8, marginTop: '1px' }} />
                </a>

                <div className="dropdown-menu">
                  <a
                    href="#women-all"
                    className="dropdown-link"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo('women', { gender: 'women', category: 'all' });
                    }}
                  >
                    View All Women's Jewellery
                  </a>
                  <div className="dropdown-divider" />
                  <a
                    href="#women-rings"
                    className="dropdown-link"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo('women', { gender: 'women', category: 'rings' });
                    }}
                  >
                    Rings
                  </a>
                  <a
                    href="#women-bracelets"
                    className="dropdown-link"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo('women', { gender: 'women', category: 'bracelets' });
                    }}
                  >
                    Bracelets
                  </a>
                  <a
                    href="#women-necklaces"
                    className="dropdown-link"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo('women', { gender: 'women', category: 'necklaces' });
                    }}
                  >
                    Necklaces
                  </a>
                  <a
                    href="#women-earrings"
                    className="dropdown-link"
                    onClick={(e) => {
                      e.preventDefault();
                      navigateTo('women', { gender: 'women', category: 'earrings' });
                    }}
                  >
                    Earrings
                  </a>
                </div>
              </li>

              <li className="nav-item">
                <a
                  href="#collections"
                  className={`nav-link ${currentView === 'collection' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('collection', { category: 'all', gender: 'all' });
                  }}
                >
                  Collections
                </a>
              </li>

              <li className="nav-item">
                <a
                  href="#story"
                  className={`nav-link ${currentView === 'story' ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigateTo('story');
                  }}
                >
                  Our Story
                </a>
              </li>
            </ul>
          </nav>

          {/* Right: Actions */}
          <div className="nav-actions">
            {/* Search Trigger */}
            <button
              className="nav-action-btn"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search catalog"
              title="Search"
            >
              <Search size={19} style={{ strokeWidth: 1.6 }} />
            </button>

            {/* Wishlist Trigger */}
            <button
              className="nav-action-btn"
              onClick={() => setIsWishlistOpen(true)}
              aria-label="View wishlist"
              title="Wishlist"
            >
              <Heart size={19} style={{ strokeWidth: 1.6 }} />
              {wishlistCount > 0 && (
                <span className="badge-count" aria-label={`${wishlistCount} items in wishlist`}>
                  {wishlistCount}
                </span>
              )}
            </button>

            {/* Shopping Bag Trigger */}
            <button
              className="nav-action-btn"
              onClick={() => setIsCartOpen(true)}
              aria-label="View shopping bag"
              title="Shopping Bag"
            >
              <ShoppingBag size={19} style={{ strokeWidth: 1.6 }} />
              {cartCount > 0 && (
                <span className="badge-count" aria-label={`${cartCount} items in bag`}>
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <div className={`drawer-backdrop ${mobileMenuOpen ? 'open' : ''}`} onClick={() => setMobileMenuOpen(false)}>
        <div
          className={`drawer-panel ${mobileMenuOpen ? 'open' : ''}`}
          onClick={(e) => e.stopPropagation()}
          style={{ left: 0, right: 'auto', transform: mobileMenuOpen ? 'translateX(0)' : 'translateX(-100%)' }}
        >
          <div className="drawer-header">
            <span className="brand-logo" style={{ fontSize: '1.25rem' }}>
              SILVESTO <span className="brand-logo-mark">LUXE</span>
            </span>
            <button onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
              <X size={20} />
            </button>
          </div>

          <div className="drawer-body" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <button
                className="btn-text"
                style={{ textAlign: 'left', width: '100%', fontSize: '0.9375rem' }}
                onClick={() => handleMobileNav(() => navigateTo('home'))}
              >
                Home
              </button>

              <button
                className="btn-text"
                style={{ textAlign: 'left', width: '100%', fontSize: '0.9375rem' }}
                onClick={() => handleMobileNav(() => navigateTo('collection', { category: 'all', gender: 'all' }))}
              >
                New Arrivals
              </button>

              {/* Mobile Men Accordion */}
              <div>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    paddingBottom: '0.5rem',
                    borderBottom: '1px solid var(--color-border)',
                    fontSize: '0.9375rem',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                    letterSpacing: '0.1em'
                  }}
                  onClick={() => setMobileMenExpanded(!mobileMenExpanded)}
                >
                  <span>Men</span>
                  <ChevronDown
                    size={16}
                    style={{
                      transform: mobileMenExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}
                  />
                </button>
                {mobileMenExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem 0 0.5rem 1rem' }}>
                    <button
                      className="btn-text"
                      style={{ fontSize: '0.8125rem', textAlign: 'left' }}
                      onClick={() => handleMobileNav(() => navigateTo('men', { gender: 'men', category: 'all' }))}
                    >
                      View All Men's Jewellery
                    </button>
                    <button
                      className="btn-text"
                      style={{ fontSize: '0.8125rem', textAlign: 'left' }}
                      onClick={() => handleMobileNav(() => navigateTo('men', { gender: 'men', category: 'rings' }))}
                    >
                      Rings
                    </button>
                    <button
                      className="btn-text"
                      style={{ fontSize: '0.8125rem', textAlign: 'left' }}
                      onClick={() => handleMobileNav(() => navigateTo('men', { gender: 'men', category: 'bracelets' }))}
                    >
                      Bracelets
                    </button>
                  </div>
                )}
              </div>

              {/* Mobile Women Accordion */}
              <div>
                <button
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    paddingBottom: '0.5rem',
                    borderBottom: '1px solid var(--color-border)',
                    fontSize: '0.9375rem',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                    letterSpacing: '0.1em'
                  }}
                  onClick={() => setMobileWomenExpanded(!mobileWomenExpanded)}
                >
                  <span>Women</span>
                  <ChevronDown
                    size={16}
                    style={{
                      transform: mobileWomenExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.2s ease'
                    }}
                  />
                </button>
                {mobileWomenExpanded && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '0.75rem 0 0.5rem 1rem' }}>
                    <button
                      className="btn-text"
                      style={{ fontSize: '0.8125rem', textAlign: 'left' }}
                      onClick={() => handleMobileNav(() => navigateTo('women', { gender: 'women', category: 'all' }))}
                    >
                      View All Women's Jewellery
                    </button>
                    <button
                      className="btn-text"
                      style={{ fontSize: '0.8125rem', textAlign: 'left' }}
                      onClick={() => handleMobileNav(() => navigateTo('women', { gender: 'women', category: 'rings' }))}
                    >
                      Rings
                    </button>
                    <button
                      className="btn-text"
                      style={{ fontSize: '0.8125rem', textAlign: 'left' }}
                      onClick={() => handleMobileNav(() => navigateTo('women', { gender: 'women', category: 'bracelets' }))}
                    >
                      Bracelets
                    </button>
                    <button
                      className="btn-text"
                      style={{ fontSize: '0.8125rem', textAlign: 'left' }}
                      onClick={() => handleMobileNav(() => navigateTo('women', { gender: 'women', category: 'necklaces' }))}
                    >
                      Necklaces
                    </button>
                    <button
                      className="btn-text"
                      style={{ fontSize: '0.8125rem', textAlign: 'left' }}
                      onClick={() => handleMobileNav(() => navigateTo('women', { gender: 'women', category: 'earrings' }))}
                    >
                      Earrings
                    </button>
                  </div>
                )}
              </div>

              <button
                className="btn-text"
                style={{ textAlign: 'left', width: '100%', fontSize: '0.9375rem' }}
                onClick={() => handleMobileNav(() => navigateTo('collection', { category: 'all', gender: 'all' }))}
              >
                Collections
              </button>

              <button
                className="btn-text"
                style={{ textAlign: 'left', width: '100%', fontSize: '0.9375rem' }}
                onClick={() => handleMobileNav(() => navigateTo('story'))}
              >
                Our Story
              </button>

              <button
                className="btn-text"
                style={{ textAlign: 'left', width: '100%', fontSize: '0.9375rem' }}
                onClick={() => handleMobileNav(() => navigateTo('care'))}
              >
                Jewellery Care
              </button>

              <button
                className="btn-text"
                style={{ textAlign: 'left', width: '100%', fontSize: '0.9375rem' }}
                onClick={() => handleMobileNav(() => navigateTo('shipping'))}
              >
                Shipping & Returns
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
