import React, { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type Variants } from 'motion/react';
import { useShop } from '../context/ShopContext';
import { luxeEase } from '../lib/motion';
import { ArrowRight } from 'lucide-react';

const staggered: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.14, delayChildren: 0.15 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: luxeEase } },
};

// Each headline line slides up from behind its own mask.
const lineReveal: Variants = {
  hidden: { y: '110%' },
  show: { y: '0%', transition: { duration: 0.95, ease: luxeEase } },
};

export const Hero: React.FC = () => {
  const { navigateTo } = useShop();
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();

  // As the hero scrolls away, the artwork drifts slower than the page and the copy lifts and fades.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const artworkY = useTransform(scrollYProgress, [0, 1], ['0%', reduceMotion ? '0%' : '20%']);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -80]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={sectionRef} className="hero-section" aria-label="Hero Introduction">
      {/* Restrained flowing metallic curve accents near edges */}
      <svg
        className="hero-ambient-curves"
        viewBox="0 0 1440 800"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <motion.path
          d="M-100,50 C300,120 700,20 1100,180 C1300,260 1480,200 1600,280"
          stroke="url(#copperGrad1)"
          strokeWidth="1.2"
          strokeOpacity="0.35"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.4, ease: 'easeInOut', delay: 0.3 }}
        />
        <motion.path
          d="M-50,750 C400,680 800,780 1250,620 C1400,560 1520,600 1650,540"
          stroke="url(#copperGrad2)"
          strokeWidth="1"
          strokeOpacity="0.25"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2.4, ease: 'easeInOut', delay: 0.6 }}
        />
        <defs>
          <linearGradient id="copperGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#B87951" stopOpacity="0" />
            <stop offset="30%" stopColor="#D6A080" stopOpacity="0.6" />
            <stop offset="70%" stopColor="#B87951" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#D6A080" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="copperGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D6A080" stopOpacity="0" />
            <stop offset="50%" stopColor="#B87951" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#E8C4A4" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      {/* Full-bleed brand artwork behind the editorial hero copy */}
      <motion.div className="hero-fullscreen-visual" aria-hidden="true" style={{ y: artworkY }}>
        <motion.img
          src="/images/hero_silvesto_luxe.png"
          alt=""
          loading="eager"
          fetchPriority="high"
          width={1600}
          height={1000}
          initial={{ opacity: 0.35, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.8, ease: luxeEase }}
        />
      </motion.div>
      <div className="hero-artwork-scrim" aria-hidden="true" />

      <motion.div className="container" style={{ position: 'relative', zIndex: 2, y: copyY, opacity: copyOpacity }}>
        <div className="hero-grid">
          {/* Left: Editorial Content */}
          <motion.div className="hero-copy" variants={staggered} initial="hidden" animate="show">
            <motion.span className="eyebrow" variants={rise}>SILVER ORNAMENTS</motion.span>

            <motion.h1 className="hero-headline" variants={staggered}>
              <span className="hero-line"><motion.span className="hero-line-text" variants={lineReveal}>Timeless</motion.span></span>
              <span className="hero-line"><motion.span className="hero-line-text" variants={lineReveal}>in Every <em>Detail.</em></motion.span></span>
            </motion.h1>

            <motion.p className="hero-supporting" variants={rise}>
              Distinctive silver ornaments, crafted for moments that stay with you.
            </motion.p>

            <motion.div variants={rise}>
              <button
                className="btn-primary"
                onClick={() => navigateTo('collection', { category: 'all', gender: 'all' })}
                aria-label="Explore collection"
              >
                <span>EXPLORE COLLECTION</span>
                <ArrowRight size={15} style={{ strokeWidth: 1.8 }} />
              </button>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>

      {/* Decorative Slide Counter & Scroll Indicator */}
      <motion.div
        className="hero-meta-decor"
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.1 }}
      >
        <span className="hero-slide-counter">01 / 04</span>
        <div style={{ width: '1px', height: '14px', backgroundColor: 'rgba(184, 121, 81, 0.3)' }} />
        <div className="hero-scroll-indicator">
          <span>SCROLL</span>
          <div className="scroll-line" />
        </div>
      </motion.div>
    </section>
  );
};
