import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent, type RefObject } from "react";

export type UseResizableRailOptions = {
  /** localStorage key the width persists under. */
  readonly storageKey: string;
  /** Width in px when nothing is stored yet, and what double-click resets to. */
  readonly defaultWidth: number;
  readonly minWidth: number;
  /** Static ceiling. The effective max is also clamped against `reserve` below. */
  readonly maxWidth: number;
  /**
   * Px reserved for whatever sits beside the rail, so the dynamic max leaves
   * that content room rather than letting the rail crowd it out entirely.
   */
  readonly reserve?: number;
  /** Px moved per arrow-key press on the handle. Defaults to 24. */
  readonly keyboardStep?: number;
};

export type ResizableRail = {
  /** Rail width in px, clamped to [minWidth, dynamic max]. */
  readonly width: number;
  /** For `aria-valuemin` on the drag handle. */
  readonly min: number;
  /** Current upper bound in px, for `aria-valuemax`. */
  readonly max: number;
  /** True while a drag is in progress — callers suppress width transitions. */
  readonly dragging: boolean;
  /** Attach to the container that spans rail + handle + neighbouring content. */
  readonly containerRef: RefObject<HTMLDivElement | null>;
  /** Spread onto the drag handle element. */
  readonly handleProps: {
    readonly onPointerDown: (event: PointerEvent) => void;
    readonly onDoubleClick: () => void;
    readonly onKeyDown: (event: KeyboardEvent) => void;
  };
};

/**
 * Drag-to-resize a rail: pointer drag, double-click to reset to
 * `defaultWidth`, arrow keys to nudge, width persisted to `localStorage`
 * under `storageKey`.
 *
 * The effective max shrinks with the container's own width (via
 * `containerRef`, `maxWidth`, and `reserve`) so a resized rail cannot crowd
 * out everything beside it on a narrow viewport; it re-clamps on mount and on
 * window resize since a persisted width can outlive the viewport it was set
 * on.
 */
export function useResizableRail({
  storageKey,
  defaultWidth,
  minWidth,
  maxWidth,
  reserve = 0,
  keyboardStep = 24,
}: UseResizableRailOptions): ResizableRail {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const clampStatic = useCallback((px: number) => Math.max(minWidth, Math.min(px, maxWidth)), [minWidth, maxWidth]);

  const readStoredWidth = useCallback((): number => {
    if (typeof window === "undefined") return defaultWidth;
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored !== null) {
        const parsed = Number.parseInt(stored, 10);
        if (Number.isFinite(parsed)) return clampStatic(parsed);
      }
    } catch {
      // localStorage unavailable — use the default.
    }
    return defaultWidth;
  }, [storageKey, defaultWidth, clampStatic]);

  const [width, setWidth] = useState<number>(readStoredWidth);
  const [dynamicMaxWidth, setDynamicMaxWidth] = useState<number>(maxWidth);
  const [dragging, setDragging] = useState(false);

  // Mirrors `width` for handlers registered once (e.g. the resize listener
  // below) that need the latest value without re-subscribing on every change.
  const widthRef = useRef(width);
  useEffect(() => {
    widthRef.current = width;
  }, [width]);

  const dynamicMax = useCallback((): number => {
    const container = containerRef.current;
    return container ? Math.min(maxWidth, container.clientWidth - reserve) : maxWidth;
  }, [maxWidth, reserve]);

  const setRail = useCallback(
    (px: number) => {
      const max = dynamicMax();
      const clamped = Math.max(minWidth, Math.min(px, max));
      setDynamicMaxWidth(max);
      setWidth(clamped);
      try {
        window.localStorage.setItem(storageKey, String(clamped));
      } catch {
        // Best-effort persistence.
      }
    },
    [dynamicMax, minWidth, storageKey],
  );

  // Re-clamp the persisted width against the live container size on mount and
  // on viewport resize — the stored value may exceed the current dynamic max.
  useEffect(() => {
    setRail(readStoredWidth());
    // Reads widthRef, not the `width` in scope: a resize listener registered
    // once on mount would otherwise close over that mount-time value and
    // reset a user-adjusted rail back to it on every subsequent resize.
    const onResize = () => setRail(widthRef.current);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // Runs once on mount; a live re-clamp loop on every width change is not
    // wanted since a drag already clamps as it goes.
  }, []);

  const draggingRef = useRef(false);
  // Cached container left edge for the drag's duration — invariant while
  // dragging, so this avoids a getBoundingClientRect() layout read per move.
  const dragLeftRef = useRef(0);
  // The pointerId captured on down; move/up filter to it so a second touch
  // landing mid-drag (multi-touch) can't hijack the resize.
  const pointerIdRef = useRef<number | null>(null);

  const onPointerDown = useCallback((event: PointerEvent) => {
    const container = containerRef.current;
    if (container !== null) dragLeftRef.current = container.getBoundingClientRect().left;
    pointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    draggingRef.current = true;
    setDragging(true);
  }, []);

  useEffect(() => {
    function onMove(event: globalThis.PointerEvent) {
      if (!draggingRef.current || event.pointerId !== pointerIdRef.current) return;
      setRail(event.clientX - dragLeftRef.current);
    }
    function onUp(event: globalThis.PointerEvent) {
      if (!draggingRef.current || event.pointerId !== pointerIdRef.current) return;
      draggingRef.current = false;
      pointerIdRef.current = null;
      setDragging(false);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [setRail]);

  const onDoubleClick = useCallback(() => setRail(defaultWidth), [setRail, defaultWidth]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        setRail(width - keyboardStep);
        event.preventDefault();
      } else if (event.key === "ArrowRight") {
        setRail(width + keyboardStep);
        event.preventDefault();
      }
    },
    [setRail, width, keyboardStep],
  );

  return {
    width,
    min: minWidth,
    max: dynamicMaxWidth,
    dragging,
    containerRef,
    handleProps: { onPointerDown, onDoubleClick, onKeyDown },
  };
}
