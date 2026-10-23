import React, { useState, useEffect, useRef } from 'react';

const INTRO_STORAGE_KEY = 'silvesto_intro_seen';

export const BrandIntro: React.FC = () => {
  const [visible, setVisible] = useState<boolean>(() => {
    // Read localStorage during the initial render so returning visitors never see
    // the overlay flash before it is removed.
    try {
      if (typeof window !== 'undefined') {
        if (window.localStorage.getItem(INTRO_STORAGE_KEY)) return false;

        // Respect reduced motion preference while keeping the same persistent
        // completion behaviour as an entered or skipped introduction.
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          window.localStorage.setItem(INTRO_STORAGE_KEY, 'true');
          return false;
        }
      }
    } catch {
      // Storage access failure
      return false;
    }
    return true;
  });

  const [fadingOut, setFadingOut] = useState<boolean>(false);
  const isDismissing = useRef(false);

  const dismiss = () => {
    // The timer, click handler, and Strict Mode effect replay can all try to
    // dismiss the overlay. Only allow the first transition to run.
    if (isDismissing.current) return;
    isDismissing.current = true;

    // Persist before beginning the transition so a reload during the fade also
    // goes straight to the site.
    try {
      window.localStorage.setItem(INTRO_STORAGE_KEY, 'true');
    } catch {
      // Ignore storage failures; the current visit can still continue.
    }
    setFadingOut(true);
    setTimeout(() => {
      setVisible(false);
    }, 700); // Match CSS fade-out duration
  };

  useEffect(() => {
    if (!visible) return;

    document.body.style.overflow = 'hidden';

    // Brief luxury presentation: hold for 3 seconds then smoothly fade out into homepage
    const timer = setTimeout(() => {
      dismiss();
    }, 3000);

    // Keyboard dismiss on Escape or Space
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ') {
        e.preventDefault();
        dismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className={`brand-intro-overlay ${fadingOut ? 'fade-out' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to SILVORA"
      onClick={dismiss}
    >
      {/* Background Ambient Glow & Vignette */}
      <div className="brand-intro-backdrop" />

      {/* Skip Button */}
      <button
        type="button"
        className="brand-intro-skip-btn"
        onClick={(e) => {
          e.stopPropagation();
          dismiss();
        }}
        aria-label="Skip brand introduction"
      >
        <span>SKIP</span>
        <span className="skip-key-hint">ESC</span>
      </button>

      {/* Main Centered Brand Lockup */}
      <div className="brand-intro-content" onClick={(e) => e.stopPropagation()}>
        {/* Approved Brand Artwork Supplied by User */}
        <div className="brand-intro-artwork-wrapper">
          <img
            src="/images/brand_intro_bg.jpg"
            alt="SILVORA ~ a brand by NADITHOKA"
            className="brand-intro-artwork-img"
          />
        </div>

        {/* Thin Metallic Rose-Gold Hairline Divider */}
        <div className="brand-intro-divider" aria-hidden="true">
          <span className="divider-line" />
          <span className="divider-diamond" />
          <span className="divider-line" />
        </div>

        {/* Atelier Subtitle & Purity Benchmark */}
        <p className="brand-intro-tagline">
          FINE STERLING SILVER ATELIER &bull; 925 HALLMARK
        </p>
      </div>

      {/* Bottom Hint */}
      <div className="brand-intro-bottom-hint" aria-hidden="true">
        <span>Click anywhere to enter atelier</span>
      </div>
    </div>
  );
};
