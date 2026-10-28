import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
} from "react";
import type * as React from "react";

/** How far the pointer travels before a press becomes a drag, in px. */
const DRAG_THRESHOLD_PX = 4;

export type UseTabDragOptions = {
  /** The row; it is also what scrolls when the row is too long. */
  readonly listRef: RefObject<HTMLElement | null>;
  /** Called once on release, when the tab lands somewhere new. */
  readonly onMove: ((value: string, toIndex: number) => void) | undefined;
  /**
   * Called once after every drag, after any `onMove`: dropped somewhere
   * new, dropped where it began, or cancelled. The press that began it may
   * have focused the item, which a drag never selects.
   */
  readonly onDragEnd?: (() => void) | undefined;
  /** Matches each draggable item; each carries its value in `data-value`. */
  readonly itemSelector?: string | undefined;
};

export type UseTabDragResult = {
  /** Call from the item's `onPointerDown` with that item's value. */
  readonly onPointerDown: (
    event: React.PointerEvent<HTMLElement>,
    value: string,
  ) => void;
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Drag to reorder the items of a horizontal row, such as a tab strip.
 *
 * While the pointer moves, the dragged item follows it (held within the row)
 * and the items it passes slide aside to make room. Positions are written
 * straight to each element's `transform`, so nothing re-renders until
 * release, when `onMove` runs once with the item's new index. The row and the
 * dragged item get `data-dragging` for styling the slide.
 *
 * Mouse and pen only: a touch drag is left to scroll the row. Escape or a
 * cancelled pointer puts everything back without a move. The click that
 * ends a drag, or the release of one cancelled with Escape, is swallowed so
 * it does not also act on the item.
 */
export function useTabDrag({
  listRef,
  onMove,
  onDragEnd,
  itemSelector = "[data-slot='panel-tab']",
}: UseTabDragOptions): UseTabDragResult {
  // The latest callbacks, for a drag that began under an earlier render.
  const onMoveRef = useRef(onMove);
  const onDragEndRef = useRef(onDragEnd);
  useLayoutEffect(() => {
    onMoveRef.current = onMove;
    onDragEndRef.current = onDragEnd;
  });
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => () => stopRef.current?.(), []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>, value: string) => {
      const list = listRef.current;
      if (
        list === null ||
        onMoveRef.current === undefined ||
        event.button !== 0 ||
        !event.isPrimary ||
        event.pointerType === "touch"
      )
        return;
      const items = [...list.querySelectorAll<HTMLElement>(itemSelector)];
      const from = items.findIndex((item) => item.dataset["value"] === value);
      const dragged = items[from];
      if (dragged === undefined) return;
      stopRef.current?.();

      // Every position is kept in the frame the drag started in, with the
      // row's scroll since then added to the pointer.
      const rects = items.map((item) => item.getBoundingClientRect());
      const own = rects[from];
      if (own === undefined) return;
      const rowStart = Math.min(...rects.map((rect) => rect.left));
      const rowEnd = Math.max(...rects.map((rect) => rect.right));
      const style = getComputedStyle(list);
      const towardEnd = style.direction === "rtl" ? -1 : 1;
      const gap = Number.parseFloat(style.columnGap) || 0;
      const room = own.width + gap;
      const scrollStart = list.scrollLeft;
      const startX = event.clientX;
      const pointerId = event.pointerId;
      let target = from;
      let dragging = false;

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== pointerId) return;
        const dx = moveEvent.clientX - startX + list.scrollLeft - scrollStart;
        if (!dragging) {
          if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
          dragging = true;
          dragged.setPointerCapture(pointerId);
          list.dataset["dragging"] = "true";
          dragged.dataset["dragging"] = "true";
        }
        const offset = clamp(dx, rowStart - own.left, rowEnd - own.right);
        dragged.style.transform = `translateX(${offset}px)`;
        const center = own.left + own.width / 2 + dx;
        // In right-to-left text the row's start is on the right.
        target = rects.filter((rect, index) => {
          if (index === from) return false;
          const middle = rect.left + rect.width / 2;
          return towardEnd === 1 ? middle < center : middle > center;
        }).length;
        items.forEach((item, index) => {
          if (index === from) return;
          const shift =
            from < target && index > from && index <= target
              ? -room * towardEnd
              : from > target && index >= target && index < from
                ? room * towardEnd
                : 0;
          item.style.transform = shift === 0 ? "" : `translateX(${shift}px)`;
        });
      };

      const swallowClick = (clickEvent: MouseEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();
      };

      // The click a release makes comes in the same task as its pointerup.
      const swallowReleaseClick = () => {
        window.addEventListener("click", swallowClick, true);
        setTimeout(() =>
          window.removeEventListener("click", swallowClick, true),
        );
      };

      /** `stop` is an unmount or a new press: no click follows, no callback. */
      const finish = (end: "drop" | "cancel" | "stop") => {
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onCancel);
        window.removeEventListener("keydown", onKeyDown, true);
        stopRef.current = null;
        if (!dragging) return;
        // The transition is styled off `data-dragging`, so clearing both in
        // one go puts every item back at rest without sliding.
        for (const item of items) item.style.transform = "";
        delete list.dataset["dragging"];
        delete dragged.dataset["dragging"];
        if (dragged.hasPointerCapture(pointerId))
          dragged.releasePointerCapture(pointerId);
        if (end === "drop") {
          swallowReleaseClick();
          if (target !== from) onMoveRef.current?.(value, target);
        }
        if (end !== "stop") onDragEndRef.current?.();
      };

      // After Escape the button is still down, and letting go over the item
      // clicks it. Swallow that click, and no later one: a press seen first
      // means the release never reached the page.
      const onReleaseAfterEscape = (releaseEvent: PointerEvent) => {
        if (releaseEvent.pointerId !== pointerId) return;
        stopAwaitingRelease();
        if (releaseEvent.type === "pointerup") swallowReleaseClick();
      };
      const stopAwaitingRelease = () => {
        window.removeEventListener("pointerup", onReleaseAfterEscape);
        window.removeEventListener("pointercancel", onReleaseAfterEscape);
        window.removeEventListener("pointerdown", onReleaseAfterEscape);
        stopRef.current = null;
      };

      function onPointerUp(upEvent: PointerEvent) {
        if (upEvent.pointerId === pointerId) finish("drop");
      }
      function onCancel(cancelEvent: PointerEvent) {
        if (cancelEvent.pointerId === pointerId) finish("cancel");
      }
      function onKeyDown(keyEvent: KeyboardEvent) {
        if (keyEvent.key !== "Escape" || !dragging) return;
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        finish("cancel");
        window.addEventListener("pointerup", onReleaseAfterEscape);
        window.addEventListener("pointercancel", onReleaseAfterEscape);
        window.addEventListener("pointerdown", onReleaseAfterEscape);
        stopRef.current = stopAwaitingRelease;
      }

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("keydown", onKeyDown, true);
      stopRef.current = () => finish("stop");
    },
    [listRef, itemSelector],
  );

  return { onPointerDown };
}
