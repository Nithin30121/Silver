// SILVORA | The first-visit brand introduction (BrandIntro) and the hero that plays after it.

export const INTRO_STORAGE_KEY = 'silvesto_intro_seen';

/** Fired on window when the introduction starts fading out, so the hero can begin revealing. */
export const INTRO_DISMISSED_EVENT = 'silvora:intro-dismissed';

/** True when the introduction won't show (already seen, or storage is unavailable). */
export function hasSeenIntro(): boolean {
  try {
    return window.localStorage.getItem(INTRO_STORAGE_KEY) !== null;
  } catch {
    return true;
  }
}
