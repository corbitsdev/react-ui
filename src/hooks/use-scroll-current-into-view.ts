import { useEffect, useRef, type RefObject } from "react";

import { usePrefersReducedMotion } from "./use-prefers-reduced-motion.js";

/**
 * Keeps "the current item" visible inside a scrollable rail: attach the
 * returned ref to whichever element is current, and it is scrolled into view
 * whenever `currentKey` changes. Headless — no markup, no styling — so a
 * stepper, a tab strip or a timeline can all share the one behaviour.
 *
 * `currentKey` takes a single primitive (a step number, a tab id) rather than
 * a dependency array, so there is nothing to spread and no way for a new
 * array identity to re-fire the scroll on every unrelated parent render.
 *
 * `block: "nearest"` keeps the page itself from jumping; only the rail's own
 * scroll position moves.
 *
 * The scroll itself is smooth, but `scrollIntoView` isn't covered by the
 * theme's global reduced-motion block, so a `prefers-reduced-motion: reduce`
 * check here falls back to an instant jump.
 */
export function useScrollCurrentIntoView<T extends HTMLElement>(currentKey: string | number): RefObject<T | null> {
  const currentRef = useRef<T>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    currentRef.current?.scrollIntoView({
      block: "nearest",
      inline: "center",
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  }, [currentKey, prefersReducedMotion]);

  return currentRef;
}
