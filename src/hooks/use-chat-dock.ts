import { useCallback, useEffect, useRef, useState } from "react";

/**
 * The three ways the dock can occupy the screen. `docked` and `fullpage` are
 * both "open" — the difference is size and position only, never a remount —
 * so the transition between them is a plain CSS transition on one element.
 */
export type ChatDockMode = "closed" | "docked" | "fullpage";

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
