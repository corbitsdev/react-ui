import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusable(container: HTMLElement): readonly HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (element) => element.offsetParent !== null,
  );
}

/**
 * Confines Tab/Shift+Tab focus to `containerRef` while `active`, and restores
 * focus to whatever had it beforehand once `active` goes false — the two
 * halves a modal dialog needs and a headless component can't get from CSS
 * alone. Dependency-free by design: the whole trap is a keydown listener and
 * a saved `Element` reference, not a library.
 *
 * On activation, focus moves into the container (its first focusable
 * descendant, or the container itself if none exists) only if focus isn't
 * already inside it — reopening a dock that already contains the active
 * element shouldn't yank focus off whatever the user just clicked.
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean): RefObject<T | null> {
  const containerRef = useRef<T>(null);
  const previouslyFocusedRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    previouslyFocusedRef.current = document.activeElement;

    if (!container.contains(document.activeElement)) {
      const [first] = getFocusable(container);
      (first ?? container).focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const current = document.activeElement;

      if (event.shiftKey && current === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && current === last) {
        event.preventDefault();
        first?.focus();
      }
    };

    container.addEventListener("keydown", onKeyDown);
    return () => {
      container.removeEventListener("keydown", onKeyDown);
      const restoreTo = previouslyFocusedRef.current;
      if (restoreTo instanceof HTMLElement) restoreTo.focus();
    };
  }, [active]);

  return containerRef;
}
