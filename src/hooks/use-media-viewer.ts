import { useCallback, useEffect, useRef } from "react";
import type { RefObject } from "react";

import { useControllableState } from "./use-controllable-state.js";

export type UseMediaViewerOptions<T> = {
  /** Everything the viewer can step through, in order. */
  readonly items: readonly T[];
  /** Controlled open item; `null` is closed. Supply with `onIndexChange`. */
  readonly index?: number | null | undefined;
  /** Seeds the open item when `index` is not supplied. */
  readonly defaultIndex?: number | null;
  readonly onIndexChange?: ((index: number | null) => void) | undefined;
};

export type MediaViewerState<T> = {
  readonly items: readonly T[];
  /** The open item's position, or `null` when closed. */
  readonly index: number | null;
  readonly item: T | null;
  readonly hasPrevious: boolean;
  readonly hasNext: boolean;
  /**
   * Opens the item at `index`. Pass the element that opened it, so focus can
   * go back there on close even where a click does not focus a button.
   */
  open(index: number, opener?: HTMLElement | null): void;
  close(): void;
  next(): void;
  previous(): void;
  /**
   * The element focus returns to on close, if `open` was given one.
   * `MediaViewer` clears it on close, so it serves one viewing.
   */
  readonly opener: RefObject<HTMLElement | null>;
};

/**
 * Which item of a set is open in a viewer. Stepping stops at either end
 * rather than wrapping, and an index outside `items` closes the viewer, so a
 * list that shrinks under an open viewer closes it rather than showing
 * nothing, and growing back does not reopen it.
 */
export function useMediaViewer<T>({
  items,
  index: controlledIndex,
  defaultIndex = null,
  onIndexChange,
}: UseMediaViewerOptions<T>): MediaViewerState<T> {
  const [rawIndex, setIndex] = useControllableState<number | null>({
    value: controlledIndex,
    defaultValue: defaultIndex,
    onChange: onIndexChange,
    name: "useMediaViewer",
  });
  const opener = useRef<HTMLElement | null>(null);
  const count = items.length;
  const index =
    rawIndex !== null &&
    Number.isInteger(rawIndex) &&
    rawIndex >= 0 &&
    rawIndex < count
      ? rawIndex
      : null;
  const outOfRange = rawIndex !== null && index === null;

  // Commits the close an out-of-range index already reads as. Keyed on
  // falling out alone, so a controlled caller hears it once.
  useEffect(() => {
    if (outOfRange) setIndex(null);
  }, [outOfRange]);

  const open = useCallback(
    (next: number, element?: HTMLElement | null) => {
      if (!Number.isInteger(next) || next < 0 || next >= count) return;
      opener.current = element ?? null;
      setIndex(next);
    },
    [count, setIndex],
  );
  const close = useCallback(() => setIndex(null), [setIndex]);
  const next = useCallback(() => {
    if (index !== null && index < count - 1) setIndex(index + 1);
  }, [index, count, setIndex]);
  const previous = useCallback(() => {
    if (index !== null && index > 0) setIndex(index - 1);
  }, [index, setIndex]);

  return {
    items,
    index,
    item: index === null ? null : (items[index] ?? null),
    hasPrevious: index !== null && index > 0,
    hasNext: index !== null && index < count - 1,
    open,
    close,
    next,
    previous,
    opener,
  };
}
