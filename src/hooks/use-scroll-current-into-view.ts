import { useEffect, useRef, type RefObject } from "react";

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
 */
export function useScrollCurrentIntoView<T extends HTMLElement>(currentKey: string | number): RefObject<T | null> {
  const currentRef = useRef<T>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [currentKey]);

  return currentRef;
}
