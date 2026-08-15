import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const query = window.matchMedia(QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  return typeof window === "undefined" ? false : window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * The OS-level "reduce motion" preference, read once and kept live.
 *
 * `theme.css` collapses every CSS transition/animation duration to near-zero
 * under this same query, so most components need nothing here — that global
 * rule is the default. This hook exists for the handful that animate outside
 * CSS (a `requestAnimationFrame` loop, an imperative scroll), where the
 * stylesheet has no duration to collapse. `animated-number`, `dither-canvas`
 * and `use-scroll-current-into-view` each read `matchMedia` by hand before
 * this shipped; this is the one place that logic lives now, and — unlike
 * those one-shot reads — it updates if the preference changes while mounted.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
