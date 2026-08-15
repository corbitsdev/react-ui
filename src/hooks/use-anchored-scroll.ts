import { useCallback, useEffect, useRef, type RefObject } from "react";

const BOTTOM_PIN_THRESHOLD_PX = 40;

export type UseAnchoredScrollResult<T extends HTMLElement> = {
  /** Attach to the scrollable container. */
  readonly containerRef: RefObject<T | null>;
  /**
   * Callback ref for the element that wraps the scrollable content (the
   * direct child that actually grows: new items, streaming text, an
   * expanding tool-output block). A callback ref, not a `RefObject`, so a
   * `ResizeObserver` attaches the instant the node mounts rather than only
   * on the hook's own first render — it is what catches in-place content
   * growth, since `itemCount` alone only fires when an item is added or
   * removed, never when an existing item grows taller.
   */
  readonly contentRef: (node: HTMLElement | null) => void;
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
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const scrollToBottom = () => {
    const container = containerRef.current;
    if (container === null) return;
    container.scrollTop = container.scrollHeight;
  };

  const handleScroll = () => {
    const container = containerRef.current;
    if (container === null) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    pinnedRef.current = distanceFromBottom <= BOTTOM_PIN_THRESHOLD_PX;
  };

  useEffect(() => {
    if (pinnedRef.current) scrollToBottom();
  }, [itemCount]);

  // Re-pins on in-place content growth — streaming text or a growing
  // tool-output block changes the content's height without changing
  // `itemCount`, so the effect above alone never catches it.
  const contentRef = useCallback((node: HTMLElement | null) => {
    resizeObserverRef.current?.disconnect();
    resizeObserverRef.current = null;
    if (node === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (pinnedRef.current) scrollToBottom();
    });
    observer.observe(node);
    resizeObserverRef.current = observer;
  }, []);

  return { containerRef, contentRef, handleScroll };
}
