import { useEffect, type RefObject } from "react";

import { CHAT_DOCK_AUTOFOCUS_DELAY_MS } from "../ui/chat-dock-timing.js";

/**
 * Focuses the given element shortly after `active` turns true — the composer
 * wants to autofocus once the dock has finished popping open, not while it is
 * still mid-animation, so the delay is deliberate rather than a magic number.
 * `delayMs` defaults to `CHAT_DOCK_AUTOFOCUS_DELAY_MS`, which is pinned `>=`
 * the dock's own entrance duration so focus never lands mid-animation.
 */
export function useDelayedAutofocus<T extends HTMLElement>(
  ref: RefObject<T | null>,
  active: boolean,
  delayMs = CHAT_DOCK_AUTOFOCUS_DELAY_MS,
): void {
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => ref.current?.focus(), delayMs);
    return () => window.clearTimeout(timer);
    // `ref` is intentionally excluded: it is a stable container, and including
    // it would refocus on every render that happens to produce a new object.
  }, [active, delayMs]);
}
