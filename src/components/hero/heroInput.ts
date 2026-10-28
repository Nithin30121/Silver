// SILVORA | How visitors turn the hero bracelet. The page records what the visitor does with the
// mouse, touch or keys; the 3D scene only reads it. Kept apart from the scene so the page can use it
// without loading Three.js.

/** What the visitor has done to the bracelet by dragging it or pressing the arrow keys. */
export interface DragState {
  /** All the turning the visitor has given it, in radians; the scene applies each new part. */
  spin: number;
  /** How far the visitor has tipped it from its resting tilt, in radians. */
  tilt: number;
  dragging: boolean;
  /** Spin speed when the visitor last let go or pressed an arrow key, in radians per second. */
  throwSpeed: number;
  /** performance.now() of that moment; the scene lets the spin glide to a stop from there. */
  thrownAt: number;
  /** performance.now() of the last drag or key press. */
  lastInteraction: number;
}

/** How far a visitor may tip the bracelet: towards showing its inside, and towards seeing it side on. */
export const TILT_RANGE = { open: -0.35, closed: 0.38 };

/** After this long untouched, the tilt settles back and the slow automatic turn picks up again. */
export const SETTLE_AFTER = 2500;

export const restingDrag = (): DragState => ({
  spin: 0, tilt: 0, dragging: false, throwSpeed: 0, thrownAt: 0, lastInteraction: Number.NEGATIVE_INFINITY,
});
