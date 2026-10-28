import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type * as React from "react";

import { useControllableState } from "./use-controllable-state.js";

/** The CSS custom property a resizable element reads its chosen width from. */
export const RESIZABLE_WIDTH_VAR = "--resizable-width";

const KEY_STEP_PX = 16;
/** Shift multiplies the arrow-key step by this. */
const LARGE_STEP_FACTOR = 4;
/** A drag ending this close to the default width lands on the default. */
const SNAP_PX = 12;
/** How far the pointer travels before a press on the handle becomes a drag. */
const DRAG_THRESHOLD_PX = 4;

export type UseResizableOptions = {
  /**
   * Controlled width in px. `null` means the element's own CSS default, which
   * the hook never duplicates: it is measured from the element when needed.
   */
  readonly width?: number | null | undefined;
  /** Seeds the width when `width` is not supplied. */
  readonly defaultWidth?: number | null | undefined;
  /** Called once per finished change: on release, a key press, or a reset. */
  readonly onWidthChange?: ((width: number | null) => void) | undefined;
  /** The narrowest the element may be set, in px. */
  readonly minWidth: number;
  /** How much of the parent's width the content beside the element keeps, in px. */
  readonly mainMinWidth: number;
  /** Arrow-key step in px; Shift moves four times as far. */
  readonly step?: number | undefined;
};

/** The element's rendered width and how wide it may go, as last measured. */
type Metrics = { readonly width: number; readonly max: number };

export type ResizableHandleProps = {
  readonly role: "separator";
  readonly tabIndex: 0;
  readonly "aria-orientation": "vertical";
  readonly "aria-valuemin": number;
  readonly "aria-valuemax": number;
  readonly "aria-valuenow": number;
  readonly onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  readonly onDoubleClick: () => void;
  readonly onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
};

export type UseResizableResult = {
  /** The committed width; `null` while the element shows its default. */
  readonly width: number | null;
  /** Attach to the element being resized; its parent is the row it shares. */
  readonly panelRef: (element: HTMLElement | null) => void;
  /** Spread onto the drag handle. */
  readonly handleProps: ResizableHandleProps;
  /** Back to the element's default width. */
  readonly reset: () => void;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function writeWidth(element: HTMLElement, width: number | null): void {
  if (width === null) element.style.removeProperty(RESIZABLE_WIDTH_VAR);
  else element.style.setProperty(RESIZABLE_WIDTH_VAR, `${width}px`);
}

/** The parent's content box: what the element's percentage widths resolve against. */
function rowWidth(element: HTMLElement): number {
  const parent = element.parentElement;
  if (parent === null) return window.innerWidth;
  const style = getComputedStyle(parent);
  // An unset padding reads as "" and parses to NaN; that is zero padding.
  const padding =
    (Number.parseFloat(style.paddingLeft) || 0) +
    (Number.parseFloat(style.paddingRight) || 0);
  return parent.clientWidth - padding;
}

function renderedWidth(element: HTMLElement): number {
  return Math.round(element.getBoundingClientRect().width);
}

/** The width the element's stylesheet gives it with no chosen width set. */
function measureDefault(element: HTMLElement): number {
  const chosen = element.style.getPropertyValue(RESIZABLE_WIDTH_VAR);
  element.style.removeProperty(RESIZABLE_WIDTH_VAR);
  const width = renderedWidth(element);
  if (chosen !== "") element.style.setProperty(RESIZABLE_WIDTH_VAR, chosen);
  return width;
}

/** Pointer movement right is +1 when the element sits at the row's end (LTR). */
function growDirection(element: HTMLElement): 1 | -1 {
  return getComputedStyle(element).direction === "rtl" ? -1 : 1;
}

/**
 * Width state for an element resized from its start edge, such as a side
 * panel at the end of a row.
 *
 * The stylesheet owns layout: the hook only writes `--resizable-width` on the
 * element (or removes it for the default) and reads back what was rendered,
 * so the CSS default, min and max are never restated in JS. The element is
 * expected to cap itself at `max(minWidth, 100% - mainMinWidth)` of its
 * parent; `Panel` does.
 *
 * A pointer drag writes the variable straight to the element each frame and
 * updates the handle's ARIA value by hand, so nothing re-renders until
 * release, when the width is committed once (snapping to the default when
 * close). A press that never moves is a click and commits nothing. Like a
 * controlled input, a parent that ignores `onWidthChange` keeps its width:
 * the drag's override is dropped before the commit.
 *
 * Keys on the handle: Left/Right arrows step (mirrored in right-to-left
 * text), Shift for bigger steps, Home and End jump to the limits, Enter
 * resets. A double-click resets too. Steps start from the rendered width,
 * so a stored width the container has since clamped never swallows a press.
 */
export function useResizable(options: UseResizableOptions): UseResizableResult {
  const {
    width: controlledWidth,
    defaultWidth = null,
    onWidthChange,
    minWidth,
    mainMinWidth,
    step = KEY_STEP_PX,
  } = options;
  const [width, setWidth] = useControllableState<number | null>({
    value: controlledWidth,
    defaultValue: defaultWidth,
    onChange: onWidthChange,
    name: "useResizable",
  });

  const elementRef = useRef<HTMLElement | null>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const widthRef = useRef(width);
  widthRef.current = width;
  const boundsRef = useRef({ minWidth, mainMinWidth });
  boundsRef.current = { minWidth, mainMinWidth };
  const draggingRef = useRef(false);
  const stopDragRef = useRef<(() => void) | null>(null);
  const [metrics, setMetrics] = useState<Metrics | null>(null);

  const maxFor = useCallback((element: HTMLElement) => {
    const { minWidth: min, mainMinWidth: mainMin } = boundsRef.current;
    return Math.max(min, Math.round(rowWidth(element) - mainMin));
  }, []);

  const measure = useCallback(() => {
    const element = elementRef.current;
    if (element === null || draggingRef.current) return;
    const next = { width: renderedWidth(element), max: maxFor(element) };
    setMetrics((previous) =>
      previous !== null &&
      previous.width === next.width &&
      previous.max === next.max
        ? previous
        : next,
    );
  }, [maxFor]);

  const panelRef = useCallback(
    (element: HTMLElement | null) => {
      observerRef.current?.disconnect();
      observerRef.current = null;
      elementRef.current = element;
      if (element === null) return;
      writeWidth(element, widthRef.current);
      measure();
      if (typeof ResizeObserver === "undefined") return;
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      if (element.parentElement !== null)
        observer.observe(element.parentElement);
      observerRef.current = observer;
    },
    [measure],
  );

  useLayoutEffect(() => {
    const element = elementRef.current;
    if (element === null) return;
    writeWidth(element, width);
    measure();
  }, [width, measure, minWidth, mainMinWidth]);

  // The observer is the ref callback's to tear down: StrictMode replays this
  // effect's cleanup on a live element.
  useEffect(() => () => stopDragRef.current?.(), []);

  const commit = useCallback(
    (next: number | null) => {
      const element = elementRef.current;
      if (element === null) return;
      let resolved: number | null = null;
      if (next !== null) {
        const clamped = clamp(
          Math.round(next),
          boundsRef.current.minWidth,
          maxFor(element),
        );
        resolved = clamped === measureDefault(element) ? null : clamped;
      }
      // Drop any drag-time override first: if the parent keeps its width,
      // nothing else would put the element back.
      writeWidth(element, widthRef.current);
      if (resolved !== widthRef.current) setWidth(resolved);
      measure();
    },
    [maxFor, measure, setWidth],
  );

  const reset = useCallback(() => commit(null), [commit]);

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    const element = elementRef.current;
    const handle = event.currentTarget;
    if (element === null || event.button !== 0 || !event.isPrimary) return;
    stopDragRef.current?.();
    handle.setPointerCapture(event.pointerId);

    const direction = growDirection(element);
    const startX = event.clientX;
    const startWidth = renderedWidth(element);
    const fallback = measureDefault(element);
    const min = boundsRef.current.minWidth;
    const max = maxFor(element);
    const startValue = handle.getAttribute("aria-valuenow");
    const root = document.documentElement;
    const previousCursor = root.style.cursor;
    const previousUserSelect = root.style.userSelect;
    let latest = startWidth;
    let frame = 0;
    // A press that never travels is a click (focus, or half a double-click),
    // not a resize: it commits nothing.
    let moved = false;

    draggingRef.current = true;
    handle.dataset["dragging"] = "true";
    root.style.cursor = "col-resize";
    // This, not preventing the press's default, keeps the drag from
    // selecting text: the default is what focuses the handle.
    root.style.userSelect = "none";

    const move = (moveEvent: PointerEvent) => {
      if (!moved && Math.abs(moveEvent.clientX - startX) < DRAG_THRESHOLD_PX)
        return;
      moved = true;
      let next = clamp(
        startWidth + direction * (startX - moveEvent.clientX),
        min,
        max,
      );
      if (Math.abs(next - fallback) < SNAP_PX) next = fallback;
      latest = Math.round(next);
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        element.style.setProperty(RESIZABLE_WIDTH_VAR, `${latest}px`);
        handle.setAttribute("aria-valuenow", String(latest));
      });
    };

    const stop = () => {
      cancelAnimationFrame(frame);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
      handle.removeEventListener("pointercancel", end);
      handle.removeEventListener("lostpointercapture", end);
      if (handle.hasPointerCapture(event.pointerId))
        handle.releasePointerCapture(event.pointerId);
      delete handle.dataset["dragging"];
      root.style.cursor = previousCursor;
      root.style.userSelect = previousUserSelect;
      // React only rewrites the attribute when its value changes, so put
      // back what it last rendered.
      if (startValue !== null) handle.setAttribute("aria-valuenow", startValue);
      draggingRef.current = false;
      stopDragRef.current = null;
    };

    function end() {
      stop();
      if (moved) commit(latest);
    }

    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
    handle.addEventListener("pointercancel", end);
    handle.addEventListener("lostpointercapture", end);
    stopDragRef.current = stop;
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    const element = elementRef.current;
    if (element === null) return;
    const current = renderedWidth(element);
    const delta =
      growDirection(element) *
      (event.shiftKey ? step * LARGE_STEP_FACTOR : step);
    let next: number | null;
    switch (event.key) {
      case "ArrowLeft":
        next = current + delta;
        break;
      case "ArrowRight":
        next = current - delta;
        break;
      case "Home":
        next = boundsRef.current.minWidth;
        break;
      case "End":
        next = maxFor(element);
        break;
      case "Enter":
        next = null;
        break;
      default:
        return;
    }
    event.preventDefault();
    commit(next);
  };

  return {
    width,
    panelRef,
    reset,
    handleProps: {
      role: "separator",
      tabIndex: 0,
      "aria-orientation": "vertical",
      "aria-valuemin": minWidth,
      "aria-valuemax": metrics?.max ?? minWidth,
      "aria-valuenow": metrics?.width ?? minWidth,
      onPointerDown,
      onDoubleClick: reset,
      onKeyDown,
    },
  };
}
