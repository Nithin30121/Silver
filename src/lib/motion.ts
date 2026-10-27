import { useEffect, useRef } from 'react';
import { useAnimate, useReducedMotion, type Transition } from 'motion/react';

/** The storefront's signature ease-out curve, the same one its CSS transitions use. */
export const luxeEase = [0.16, 1, 0.3, 1] as const;

/** A quick spring with very little overshoot, for hover feedback. */
export const gentleSpring: Transition = { type: 'spring', bounce: 0.15, visualDuration: 0.3 };

/** Props for a motion element that fades and lifts into place the first time it scrolls into view. */
export const revealOnScroll = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.15 },
  transition: { duration: 0.7, ease: luxeEase, delay } satisfies Transition,
});

/** Props for a drawer panel that slides in from one edge and can reverse mid-slide. */
export const drawerSlide = (open: boolean, edge: 'left' | 'right' = 'right') => ({
  initial: false,
  animate: { x: open ? '0%' : edge === 'right' ? '100%' : '-100%' },
  transition: { type: 'spring', bounce: 0, visualDuration: 0.45 } satisfies Transition,
});

/** Returns a ref for an element that gives a short bump whenever `value` goes up. */
export function useBumpOnIncrease<T extends Element>(value: number) {
  const [scope, animate] = useAnimate<T>();
  const reduceMotion = useReducedMotion();
  const previous = useRef(value);

  useEffect(() => {
    if (value > previous.current && scope.current && !reduceMotion) {
      animate(scope.current, { scale: [1, 1.4, 1] }, { duration: 0.4, ease: 'easeOut' });
    }
    previous.current = value;
  }, [value, animate, scope, reduceMotion]);

  return scope;
}
