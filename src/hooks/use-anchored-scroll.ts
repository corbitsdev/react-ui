import { useEffect, useRef, type RefObject } from "react";

const BOTTOM_PIN_THRESHOLD_PX = 40;

export type UseAnchoredScrollResult<T extends HTMLElement> = {
  /** Attach to the scrollable container. */
  readonly containerRef: RefObject<T | null>;
  /** Attach to the container's `onScroll`. */
  readonly handleScroll: () => void;
};

/**
 * Stick-to-bottom scrolling for a growing message list: while the reader is
 * at (or near) the bottom, a new item keeps them pinned there; once they
 * scroll up to read history, new items arrive quietly and their position
 * holds — nothing yanks them back down.
 *
 * "Near the bottom" is a `BOTTOM_PIN_THRESHOLD_PX` band rather than an exact
 * match: a container that is pinned but has a few stray pixels of subpixel
 * scroll rounding must still count as pinned, or the reader gets un-pinned by
 * their own browser's rendering.
 *
 * `itemCount` is a single number — the length of whatever list is rendered —
 * rather than the list itself, so a new array identity with the same length
 * never fires a scroll that has nothing new to show for it. The initial
 * render always lands pinned to the bottom, matching how a chat transcript
 * should open: at the most recent message.
 */
export function useAnchoredScroll<T extends HTMLElement = HTMLDivElement>(
  itemCount: number,
): UseAnchoredScrollResult<T> {
  const containerRef = useRef<T>(null);
  const pinnedRef = useRef(true);

  const handleScroll = () => {
    const container = containerRef.current;
    if (container === null) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    pinnedRef.current = distanceFromBottom <= BOTTOM_PIN_THRESHOLD_PX;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (container === null) return;
    if (pinnedRef.current) {
      container.scrollTop = container.scrollHeight;
    }
  }, [itemCount]);

  return { containerRef, handleScroll };
}
