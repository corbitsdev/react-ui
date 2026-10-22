import { useEffect, type RefObject } from "react";

/**
 * Roughly a typical panel entrance (a few hundred milliseconds), so focus
 * never lands on an element that is still moving.
 */
const DEFAULT_DELAY_MS = 280;

/**
 * Focuses the given element shortly after `active` turns true: an element
 * that animates in takes focus once it has settled, not while it is still
 * mid-animation. Pass a `delayMs` at least as long as the entrance it waits
 * for.
 */
export function useDelayedAutofocus<T extends HTMLElement>(
  ref: RefObject<T | null>,
  active: boolean,
  delayMs = DEFAULT_DELAY_MS,
): void {
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => ref.current?.focus(), delayMs);
    return () => window.clearTimeout(timer);
    // `ref` is intentionally excluded: it is a stable container, and including
    // it would refocus on every render that happens to produce a new object.
  }, [active, delayMs]);
}
