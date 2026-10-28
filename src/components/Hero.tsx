import React, { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform, type Variants } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { luxeEase } from '../lib/motion';
import { INTRO_DISMISSED_EVENT, hasSeenIntro } from '../lib/intro';
import '../styles/hero.css';

// Three.js arrives in its own download only when the hero needs it, so other pages stay light.
const HeroScene = lazy(() => import('./hero/HeroScene'));

const media = (query: string) => typeof window !== 'undefined' && window.matchMedia(query).matches;

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** Reports when the 3D scene can't load or start (old browser, blocked GPU), so the drawn bracelet shows instead. */
class SceneBoundary extends Component<{ onFail: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { this.props.onFail(); }
  render() { return this.state.failed ? null : this.props.children; }
}

/** A softly shaded silver bracelet drawn with CSS: the hero without WebGL. */
const StillBracelet: React.FC = () => (
  <div className="lux-hero-still" aria-hidden="true"><span /></div>
);

/** When the hero starts revealing: straight away, or as the first-visit introduction fades. */
function useRevealTime(skipIntro: boolean): number | null {
  const [revealAt, setRevealAt] = useState<number | null>(() => (skipIntro || hasSeenIntro() ? performance.now() : null));
  useEffect(() => {
    if (revealAt !== null) return;
    const begin = () => setRevealAt((current) => current ?? performance.now());
    window.addEventListener(INTRO_DISMISSED_EVENT, begin);
    // In case the introduction is closed some other way, never leave the hero hidden.
    const fallback = window.setTimeout(begin, 5000);
    return () => {
      window.removeEventListener(INTRO_DISMISSED_EVENT, begin);
      window.clearTimeout(fallback);
    };
  }, [revealAt]);
  return revealAt;
}

const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: (delay: number) => ({ opacity: 1, y: 0, transition: { duration: 0.9, ease: luxeEase, delay } }),
};

export const Hero: React.FC = () => {
  const { navigateTo } = useShop();
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = Boolean(useReducedMotion());
  const [device] = useState(() => ({
    webgl: supportsWebGL(),
    lowPower: media('(max-width: 768px), (pointer: coarse)'),
    finePointer: media('(hover: hover) and (pointer: fine)'),
  }));
  const revealAt = useRevealTime(reduceMotion);
  const revealed = revealAt !== null;
  const [active, setActive] = useState(true);
  const [sceneFailed, setSceneFailed] = useState(false);
  const pointer = useRef({ x: 0, y: 0 });
  const scroll = useRef(0);
  // The free space above the lettering, which the 3D bracelet fills (see measuring below).
  const spaceRef = useRef<HTMLDivElement>(null);
  const anchor = useRef({ x: 0.5, y: 0.4, width: 1, height: 0.5 });

  // As the hero scrolls away the text lifts and fades while the bracelet rises and turns faster.
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, reduceMotion ? 0 : -70]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);
  useMotionValueEvent(scrollYProgress, 'change', (value) => { scroll.current = value; });

  // Only a mouse or trackpad steers the scene; touch screens keep it still.
  useEffect(() => {
    if (!device.finePointer || reduceMotion) return;
    const follow = (event: PointerEvent) => {
      pointer.current = { x: (event.clientX / window.innerWidth) * 2 - 1, y: (event.clientY / window.innerHeight) * 2 - 1 };
    };
    window.addEventListener('pointermove', follow, { passive: true });
    return () => window.removeEventListener('pointermove', follow);
  }, [device.finePointer, reduceMotion]);

  // Tell the scene where the space above the lettering is, so the bracelet sits there at any size.
  // Offsets ignore the scroll transform, so the space is measured where it rests.
  useEffect(() => {
    const section = sectionRef.current;
    const space = spaceRef.current;
    if (!section || !space) return;
    const measure = () => {
      anchor.current = {
        x: (space.offsetLeft + space.offsetWidth / 2) / section.offsetWidth,
        y: (space.offsetTop + space.offsetHeight / 2) / section.offsetHeight,
        width: space.offsetWidth / section.offsetWidth,
        height: space.offsetHeight / section.offsetHeight,
      };
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(section);
    observer.observe(space);
    return () => observer.disconnect();
  }, []);

  // Stop drawing while the hero is scrolled away or the tab is in the background.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let onScreen = true;
    const update = () => setActive(onScreen && document.visibilityState === 'visible');
    const observer = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; update(); });
    observer.observe(section);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  const animate = revealed ? 'show' : 'hidden';
  const initial = reduceMotion ? false : 'hidden';

  return (
    <section ref={sectionRef} className="lux-hero" aria-labelledby="lux-hero-title">
      <div className="lux-hero-atmosphere" aria-hidden="true">
        <span className="lux-hero-glow" />
        <span className="lux-hero-streak is-high" />
        <span className="lux-hero-streak is-low" />
      </div>

      {device.webgl && (
        <div className="lux-hero-stage" aria-hidden="true">
          <SceneBoundary onFail={() => setSceneFailed(true)}>
            <Suspense fallback={null}>
              <HeroScene revealAt={revealAt} active={active} reducedMotion={reduceMotion} lowPower={device.lowPower}
                motion={{ pointer, scroll, anchor }} />
            </Suspense>
          </SceneBoundary>
        </div>
      )}

      <motion.div className="lux-hero-content" style={{ y: contentY, opacity: contentOpacity }}>
        <motion.p className="lux-hero-label" variants={rise} custom={0.9} initial={initial} animate={animate}>
          925 STERLING SILVER
        </motion.p>

        {/* The bracelet's place. Without WebGL a drawn bracelet fills it instead. */}
        <div ref={spaceRef} className="lux-hero-space">
          {(!device.webgl || sceneFailed) && <StillBracelet />}
        </div>

        <h1 id="lux-hero-title" className="lux-hero-title">
          <span className="lux-hero-sr-only">SILVORA LUXE</span>
          <motion.span
            className="lux-hero-wordmark"
            aria-hidden="true"
            initial={reduceMotion ? false : { opacity: 0, filter: 'blur(16px)', clipPath: 'inset(0% 50% 0% 50%)', letterSpacing: '0.1em' }}
            animate={revealed ? { opacity: 1, filter: 'blur(0px)', clipPath: 'inset(0% 0% 0% 0%)', letterSpacing: '-0.01em' } : undefined}
            transition={{ duration: 2.2, ease: luxeEase, delay: 0.15 }}
          >
            SILVORA
          </motion.span>
          <motion.span
            className="lux-hero-luxe"
            aria-hidden="true"
            initial={reduceMotion ? false : { opacity: 0, letterSpacing: '0.45em' }}
            animate={revealed ? { opacity: 1, letterSpacing: '1em' } : undefined}
            transition={{ duration: 1.8, ease: luxeEase, delay: 1.1 }}
          >
            LUXE
          </motion.span>
        </h1>

        <div className="lux-hero-footer">
          <motion.p className="lux-hero-tagline" variants={rise} custom={1.6} initial={initial} animate={animate}>
            Redefining silver through form, light, and motion.
          </motion.p>
          <motion.button type="button" className="lux-hero-primary" variants={rise} custom={1.85} initial={initial} animate={animate}
            onClick={() => navigateTo('collection', { category: 'all', gender: 'all' })}>
            <span>EXPLORE COLLECTION</span>
            <ArrowRight size={15} strokeWidth={1.6} aria-hidden="true" />
          </motion.button>
        </div>
      </motion.div>
    </section>
  );
};
