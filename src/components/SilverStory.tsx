import React, { useRef } from 'react';
import { motion, useInView, useReducedMotion, useScroll, useSpring, useTransform } from 'motion/react';
import { luxeEase, revealOnScroll } from '../lib/motion';
import '../styles/silver-story.css';

interface StoryPhotoProps {
  name: 'flatlay' | 'wrist';
  alt: string;
}

/**
 * How each photo drifts. The picture is enlarged a little inside its square and slides down within it as the page
 * scrolls up, so it moves slower than the page around it, like looking through a window. The wrist photo grows from
 * its top edge and stops drifting once it is fully in view, so the fingertips are never cut off at rest.
 */
const DRIFT = {
  flatlay: { scale: 1.14, at: [0, 1], y: ['-7%', '7%'] },
  wrist: { scale: 1.07, at: [0, 0.5], y: ['-7%', '0%'] },
} as const;

/** A photo with parallax depth. It follows the scroll, so scrolling back up plays it in reverse. */
const StoryPhoto: React.FC<StoryPhotoProps> = ({ name, alt }) => {
  const frame = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const drift = DRIFT[name];
  // 0 as the photo's top reaches the bottom of the screen, 1 once its bottom has left the top.
  const { scrollYProgress } = useScroll({ target: frame, offset: ['start end', 'end start'] });
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.0005 });
  const y = useTransform(progress, [...drift.at], [...drift.y]);
  const file = `/images/silver_${name === 'flatlay' ? 'satin_flatlay' : 'hand_bracelet'}`;

  return (
    <figure ref={frame} className={`silver-story-photo is-${name}`}>
      <motion.img
        src={`${file}.webp`}
        srcSet={`${file}_800.webp 800w, ${file}.webp 1254w`}
        sizes="(max-width: 768px) 100vw, 50vw"
        alt={alt}
        width={1254} height={1254} loading="lazy" decoding="async"
        style={reduceMotion ? undefined : { scale: drift.scale, y }}
      />
    </figure>
  );
};

/** The hallmark, and the strip of digits each one rolls along: 0 to 9 twice, so every digit makes a full turn. */
const HALLMARK = [9, 2, 5];
const REEL = Array.from({ length: 20 }, (_, index) => index % 10);

/**
 * 925, with each digit rolling up into place like a counter as the words fade in, the 5 settling last. Screen
 * readers hear the plain number; anyone who has asked for less motion simply sees it.
 */
const RollingHallmark: React.FC = () => {
  const heading = useRef<HTMLHeadingElement>(null);
  const reduceMotion = useReducedMotion();
  // The same moment the words around it start to fade in.
  const inView = useInView(heading, { once: true, amount: 0.15 });

  if (reduceMotion) return <h2 className="silver-story-number">925</h2>;

  return (
    <h2 ref={heading} className="silver-story-number is-rolling">
      <span className="visually-hidden">925</span>
      {HALLMARK.map((digit, index) => (
        <span key={index} className="silver-story-digit" aria-hidden="true">
          {/* Invisible: gives the digit its own width, so 925 is spaced exactly as when it is still. */}
          <span className="silver-story-digit-size">{digit}</span>
          <motion.span
            className="silver-story-reel"
            initial={{ y: '0%' }}
            animate={inView ? { y: `${-(10 + digit) * (100 / REEL.length)}%` } : undefined}
            transition={{ duration: 1.3 + index * 0.25, ease: luxeEase, delay: 0.15 }}
          >
            {REEL.map((value, position) => <span key={position}>{value}</span>)}
          </motion.span>
        </span>
      ))}
    </h2>
  );
};

/** The four-pointed star between the two gold rules. */
const Star: React.FC = () => (
  <svg className="silver-story-star" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path d="M12 0C12.7 7.3 16.7 11.3 24 12C16.7 12.7 12.7 16.7 12 24C11.3 16.7 7.3 12.7 0 12C7.3 11.3 11.3 7.3 12 0Z" />
  </svg>
);

/**
 * Straight after the hero: what SILVORA's silver is. Four squares, photo and words in a checkerboard: the
 * collection on ivory satin beside 925, then "Silver is not a substitute for gold" beside a bracelet on the wrist.
 * On a phone they stack, still alternating photo and words.
 */
export const SilverStory: React.FC = () => (
  <section className="silver-story">
    <div className="silver-story-grid">
      <StoryPhoto
        name="flatlay"
        alt="A silver necklace, drop earrings, three rings and a tennis bracelet, all set with clear stones, on ivory satin"
      />

      <div className="silver-story-panel is-hallmark">
        <motion.div className="silver-story-copy" {...revealOnScroll()}>
          <RollingHallmark />
          <p className="silver-story-text">
            Each SILVORA piece is forged exclusively from certified 925 hallmarked sterling silver, composed of 92.5%
            pure silver alloyed with copper for structural durability.
          </p>
        </motion.div>
      </div>

      <div className="silver-story-panel is-statement">
        <motion.div className="silver-story-copy" {...revealOnScroll()}>
          <h2 className="silver-story-title">Silver is not a substitute for <em>gold.</em></h2>
          <div className="silver-story-rule" aria-hidden="true">
            <span />
            <Star />
            <span />
          </div>
          <p className="silver-story-text">
            Silver is a distinct noble metal possessed of its own calm, architectural luminescence.
          </p>
        </motion.div>
      </div>

      <StoryPhoto
        name="wrist"
        alt="A hand raised against a soft blue sky, wearing a silver bracelet of round and marquise stones with a slider clasp"
      />
    </div>
  </section>
);
