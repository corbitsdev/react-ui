import { useCallback, useEffect, useRef, type RefObject } from "react";
import type * as React from "react";

/** How far the pointer travels before a press becomes a drag, in px. */
const DRAG_THRESHOLD_PX = 4;

export type UseTabDragOptions = {
  /** The row; it is also what scrolls when the row is too long. */
  readonly listRef: RefObject<HTMLElement | null>;
  /** Called once on release, when the tab lands somewhere new. */
  readonly onMove: ((value: string, toIndex: number) => void) | undefined;
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
 * cancelled pointer puts everything back without a move, and the click that
 * ends a drag is swallowed so it does not also act on the item.
 */
export function useTabDrag({
  listRef,
  onMove,
  itemSelector = "[data-slot='panel-tab']",
}: UseTabDragOptions): UseTabDragResult {
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;
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

      const finish = (commit: boolean) => {
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
        window.addEventListener("click", swallowClick, true);
        setTimeout(() =>
          window.removeEventListener("click", swallowClick, true),
        );
        if (commit && target !== from) onMoveRef.current?.(value, target);
      };

      function onPointerUp(upEvent: PointerEvent) {
        if (upEvent.pointerId === pointerId) finish(true);
      }
      function onCancel(cancelEvent: PointerEvent) {
        if (cancelEvent.pointerId === pointerId) finish(false);
      }
      function onKeyDown(keyEvent: KeyboardEvent) {
        if (keyEvent.key !== "Escape" || !dragging) return;
        keyEvent.preventDefault();
        keyEvent.stopPropagation();
        finish(false);
      }

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onCancel);
      window.addEventListener("keydown", onKeyDown, true);
      stopRef.current = () => finish(false);
    },
    [listRef, itemSelector],
  );

  return { onPointerDown };
}
