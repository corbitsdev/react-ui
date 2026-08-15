import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The three ways the dock can occupy the screen. `docked` and `fullpage` are
 * both "open" — the difference is size and position only, never a remount —
 * so the transition between them is a plain CSS transition on one element.
 */
export type ChatDockMode = "closed" | "docked" | "fullpage";

/**
 * Elements whose own Escape handling should win over the dock's step-down —
 * a `<select>` popup, a Radix Popover/DropdownMenu/Select/Dialog (all of
 * which mark their content with `role="dialog"`, `role="listbox"`, or
 * `role="menu"`, and Radix specifically renders its floating content inside
 * `[data-radix-popper-content-wrapper]`), or any other overlay the composer
 * hosts. Matched against `composedPath()` so a portal-rendered overlay still
 * counts, even though it lives outside the dock's own DOM subtree.
 */
export const NESTED_OVERLAY_SELECTOR = [
  "select",
  '[role="dialog"]',
  '[role="alertdialog"]',
  '[role="listbox"]',
  '[role="menu"]',
  "[data-radix-popper-content-wrapper]",
].join(",");

/**
 * True when this Escape keypress belongs to UI nested inside a container, not
 * the container itself — either something already called `preventDefault()`
 * on it, or `composedPath()` reaches a nested overlay element before it
 * reaches `ownSlot`. Overlay matches are checked first and win immediately
 * regardless of whose container the path eventually reaches, so this is safe
 * to reuse for any container (`chat-dock`, `canvas-host`, ...) — `ownSlot`
 * only trims the walk short once it's clear nothing nested caught the key.
 */
export function isEscapeConsumedByNestedUI(event: KeyboardEvent, ownSlot = "chat-dock"): boolean {
  if (event.defaultPrevented) return true;
  const path = typeof event.composedPath === "function" ? event.composedPath() : [];
  for (const node of path) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.matches(NESTED_OVERLAY_SELECTOR)) return true;
    if (node.dataset.slot === ownSlot) return false;
  }
  return false;
}

export type UseChatDockResult = {
  readonly mode: ChatDockMode;
  readonly isOpen: boolean;
  /**
   * True only on the render where `mode` just left `closed` — cycling
   * `docked <-> fullpage` never sets this, so the pop-in entrance plays once
   * per open, not on every resize between the two open sizes.
   */
  readonly shouldAnimateEntrance: boolean;
  readonly setMode: (mode: ChatDockMode) => void;
  /** Closed → docked. No-op once already open, so a stray call never demotes fullpage. */
  readonly open: () => void;
  readonly close: () => void;
  readonly expand: () => void;
  readonly collapse: () => void;
  readonly toggle: () => void;
};

/**
 * Owns the dock's open/closed/size state. Nothing here renders — the
 * `ChatDock` piece reads `mode` and applies the matching CSS classes, and the
 * three-state CSS transition (not a component swap) is what makes
 * `docked → fullpage` feel like one panel growing instead of two panels
 * trading places.
 *
 * Escape steps down one level rather than closing outright: `fullpage` →
 * `docked`, then `docked` → `closed`. A fullpage reader who hits Escape once
 * expects to land back at the corner panel, not to lose the conversation
 * outright — a second press finishes the job.
 */
export function useChatDock(initialMode: ChatDockMode = "closed"): UseChatDockResult {
  const [mode, setMode] = useState<ChatDockMode>(initialMode);

  const previousModeRef = useRef<ChatDockMode>(initialMode);
  const previousMode = previousModeRef.current;
  if (previousMode !== mode) previousModeRef.current = mode;
  const shouldAnimateEntrance = previousMode === "closed" && mode !== "closed";

  useEffect(() => {
    if (mode === "closed") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (isEscapeConsumedByNestedUI(event)) return;
      setMode((current) => (current === "fullpage" ? "docked" : "closed"));
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode]);

  const open = useCallback(() => setMode((current) => (current === "closed" ? "docked" : current)), []);
  const close = useCallback(() => setMode("closed"), []);
  const expand = useCallback(() => setMode("fullpage"), []);
  const collapse = useCallback(() => setMode((current) => (current === "closed" ? current : "docked")), []);
  const toggle = useCallback(() => setMode((current) => (current === "closed" ? "docked" : "closed")), []);

  return { mode, isOpen: mode !== "closed", shouldAnimateEntrance, setMode, open, close, expand, collapse, toggle };
}
