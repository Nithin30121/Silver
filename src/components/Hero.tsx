import React, { Component, Suspense, lazy, useEffect, useRef, useState, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { useShop } from '../context/ShopContext';
import { luxeEase } from '../lib/motion';
import type { SpinState } from './hero/TennisScene';
import '../styles/hero.css';

// Three.js arrives in its own download only when the hero needs it, so other pages stay light.
const TennisScene = lazy(() => import('./hero/TennisScene'));

const media = (query: string) => typeof window !== 'undefined' && window.matchMedia(query).matches;

function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'));
  } catch {
    return false;
  }
}

/** If the 3D scene can't start (an old browser, a blocked graphics card), the hero simply shows without it. */
class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? null : this.props.children; }
}

/** Dragging turns the bracelet about this much per pixel, sideways or up and down. */
const SPIN_PER_PIXEL = 0.011;

/** How fast it was turning, smoothed over the last few moves, for the glide when it is let go. */
const blendSpeed = (previous: number, change: number, seconds: number) =>
  Math.max(-6, Math.min(6, previous * 0.5 + (change / seconds) * 0.5));

/**
 * The home page hero: deep red velvet with the SILVORA logo and menu centred in the header above it (see Header),
 * a double-row silver tennis bracelet floating in the middle, and Discover at the bottom right.
 */
export const Hero: React.FC = () => {
  const { navigateTo } = useShop();
  const reduceMotion = Boolean(useReducedMotion());
  const stageRef = useRef<HTMLDivElement>(null);
  const safeRef = useRef<HTMLDivElement>(null);
  const safeArea = useRef({ top: 0, right: 0, bottom: 0, left: 0 });
  const [device] = useState(() => ({
    webgl: supportsWebGL(),
    lowPower: media('(max-width: 768px), (pointer: coarse)'),
    finePointer: media('(hover: hover) and (pointer: fine)'),
  }));
  const [active, setActive] = useState(true);
  const spin = useRef<SpinState>({
    dragging: false, offset: 0, glide: 0, tilt: 0, tiltGlide: 0, releasedAt: 0, lastInteraction: 0,
  });
  const pointer = useRef({ x: 0, y: 0 });
  const last = useRef({ x: 0, y: 0, t: 0, speed: 0, tiltSpeed: 0 });

  // The bracelet rests between the header and Discover; the scene sizes and centres it in that space, while
  // drawing across the whole hero so nothing is cut off when it is turned.
  useEffect(() => {
    const stage = stageRef.current;
    const safe = safeRef.current;
    if (!stage || !safe) return;
    const measure = () => {
      const outer = stage.getBoundingClientRect();
      const inner = safe.getBoundingClientRect();
      safeArea.current = {
        top: inner.top - outer.top, right: outer.right - inner.right, bottom: outer.bottom - inner.bottom, left: inner.left - outer.left,
      };
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    observer.observe(safe);
    return () => observer.disconnect();
  }, []);

  // Only a mouse or trackpad leans the bracelet; touch screens keep it steady.
  useEffect(() => {
    if (!device.finePointer || reduceMotion) return;
    const follow = (event: PointerEvent) => {
      pointer.current = { x: (event.clientX / window.innerWidth) * 2 - 1, y: (event.clientY / window.innerHeight) * 2 - 1 };
    };
    window.addEventListener('pointermove', follow, { passive: true });
    return () => window.removeEventListener('pointermove', follow);
  }, [device.finePointer, reduceMotion]);

  // Stop drawing while the hero is scrolled away or the tab is in the background.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let onScreen = true;
    const update = () => setActive(onScreen && document.visibilityState === 'visible');
    const observer = new IntersectionObserver(([entry]) => { onScreen = entry.isIntersecting; update(); });
    observer.observe(stage);
    document.addEventListener('visibilitychange', update);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  // Drag to turn it any way, all the way round: sideways turns it round, up and down tips it over. A flick keeps
  // it turning for a moment. On touch screens up and down still scroll the page, so a finger turns it sideways.
  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    spin.current.dragging = true;
    spin.current.glide = 0;
    spin.current.tiltGlide = 0;
    spin.current.lastInteraction = performance.now();
    last.current = { x: event.clientX, y: event.clientY, t: performance.now(), speed: 0, tiltSpeed: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.classList.add('is-dragging');
  };
  const moveDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!spin.current.dragging) return;
    const now = performance.now();
    const seconds = Math.max(0.008, (now - last.current.t) / 1000);
    const turn = (event.clientX - last.current.x) * SPIN_PER_PIXEL;
    const tip = event.pointerType === 'touch' ? 0 : (event.clientY - last.current.y) * SPIN_PER_PIXEL;
    spin.current.offset += turn;
    spin.current.tilt += tip;
    spin.current.lastInteraction = now;
    last.current = {
      x: event.clientX, y: event.clientY, t: now,
      speed: blendSpeed(last.current.speed, turn, seconds), tiltSpeed: blendSpeed(last.current.tiltSpeed, tip, seconds),
    };
  };
  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!spin.current.dragging) return;
    spin.current.dragging = false;
    // Held still before letting go: no flick.
    const flicked = performance.now() - last.current.t <= 90;
    spin.current.glide = flicked ? last.current.speed : 0;
    spin.current.tiltGlide = flicked ? last.current.tiltSpeed : 0;
    spin.current.releasedAt = performance.now();
    spin.current.lastInteraction = performance.now();
    event.currentTarget.classList.remove('is-dragging');
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <section className="lux-hero" aria-labelledby="lux-hero-title">
      <h1 id="lux-hero-title" className="visually-hidden">SILVORA Luxe: fine sterling silver jewellery for women and men</h1>
      <div ref={safeRef} className="lux-hero-safe" aria-hidden="true" />
      <div ref={stageRef} className="lux-hero-stage" aria-hidden="true"
        onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
        {device.webgl && (
          <SceneBoundary>
            <Suspense fallback={null}>
              <TennisScene
                active={active} reducedMotion={reduceMotion} lowPower={device.lowPower}
                spin={spin} pointer={pointer} safeArea={safeArea}
              />
            </Suspense>
          </SceneBoundary>
        )}
      </div>
      <motion.button
        type="button"
        className="lux-hero-discover"
        onClick={() => navigateTo('collection', { category: 'all', rootCategoryId: 'all', gender: 'all' })}
        initial={reduceMotion ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: luxeEase, delay: 0.35 }}
      >
        Discover
      </motion.button>
    </section>
  );
};
