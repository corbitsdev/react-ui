import { useEffect, useRef, type RefObject } from "react";

/**
 * Keeps "the current item" visible inside a scrollable rail: attach the
 * returned ref to whichever element is current, and it is scrolled into view
 * whenever `deps` changes. Headless — no markup, no styling — so a stepper,
 * a tab strip or a timeline can all share the one behaviour.
 *
 * `block: "nearest"` keeps the page itself from jumping; only the rail's own
 * scroll position moves.
 */
export function useScrollCurrentIntoView<T extends HTMLElement>(deps: readonly unknown[]): RefObject<T | null> {
  const currentRef = useRef<T>(null);

  useEffect(() => {
    // The caller names what "current changed" means; re-running on its own
    // deps is the contract.
    currentRef.current?.scrollIntoView({ block: "nearest", inline: "center" });
  }, deps);

  return currentRef;
}
