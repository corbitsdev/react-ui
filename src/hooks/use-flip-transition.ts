import { useLayoutEffect, useRef, type RefObject } from "react";

export type UseFlipTransitionOptions = {
  readonly durationMs?: number;
  readonly easing?: string;
};

/**
 * FLIP (First, Last, Invert, Play): pass a `key` that changes whenever the
 * element's box should visually morph into a new size/position. Layout
 * itself is never animated — the element jumps straight to its new geometry
 * — this hook measures the rect from before and after that jump, applies the
 * inverse as a `transform`, and transitions only `transform` back to
 * identity. `key === null` means "this change shouldn't morph" (e.g. an
 * entrance/exit already has its own animation) and is measured but skipped.
 */
export function useFlipTransition<T extends HTMLElement>(
  key: string | null,
  { durationMs = 280, easing = "var(--ease-out)" }: UseFlipTransitionOptions = {},
): RefObject<T | null> {
  const ref = useRef<T>(null);
  const previousRectRef = useRef<DOMRect | null>(null);
  const previousKeyRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;

    const previousRect = previousRectRef.current;
    const previousKey = previousKeyRef.current;
    const shouldMorph = previousRect !== null && previousKey !== null && key !== null && previousKey !== key;

    if (shouldMorph && previousRect) {
      const nextRect = element.getBoundingClientRect();
      const deltaX = previousRect.left - nextRect.left;
      const deltaY = previousRect.top - nextRect.top;
      const scaleX = previousRect.width / nextRect.width;
      const scaleY = previousRect.height / nextRect.height;

      element.style.transition = "none";
      element.style.transformOrigin = "top left";
      element.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})`;

      // Read layout back before switching the transition on: two style writes
      // in the same tick otherwise coalesce, and the element skips straight
      // to its resting transform instead of animating there.
      void element.getBoundingClientRect();

      element.style.transition = `transform ${durationMs}ms ${easing}`;
      element.style.transform = "";
    }

    previousKeyRef.current = key;
    previousRectRef.current = element.getBoundingClientRect();
  }, [key, durationMs, easing]);

  return ref;
}
