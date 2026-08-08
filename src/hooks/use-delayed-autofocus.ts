import { useEffect, type RefObject } from "react";

/**
 * Focuses the given element shortly after `active` turns true — the composer
 * wants to autofocus once the dock has finished popping open, not while it is
 * still mid-animation, so the delay is deliberate rather than a magic number.
 * `delayMs` defaults to 220, matching the dock's own entrance timing.
 */
export function useDelayedAutofocus<T extends HTMLElement>(
  ref: RefObject<T | null>,
  active: boolean,
  delayMs = 220,
): void {
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => ref.current?.focus(), delayMs);
    return () => window.clearTimeout(timer);
    // `ref` is intentionally excluded: it is a stable container, and including
    // it would refocus on every render that happens to produce a new object.
  }, [active, delayMs]);
}
