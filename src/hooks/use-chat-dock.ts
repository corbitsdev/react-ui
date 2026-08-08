import { useCallback, useEffect, useState } from "react";

/**
 * The three ways the dock can occupy the screen. `docked` and `fullpage` are
 * both "open" — the difference is size and position only, never a remount —
 * so the transition between them is a plain CSS transition on one element.
 */
export type ChatDockMode = "closed" | "docked" | "fullpage";

export type UseChatDockResult = {
  readonly mode: ChatDockMode;
  readonly isOpen: boolean;
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
 * Escape always closes fully, mirroring the popup-with-scrim pattern: a
 * fullpage reader who hits Escape expects to leave the assistant, not to step
 * back down to the corner.
 */
export function useChatDock(initialMode: ChatDockMode = "closed"): UseChatDockResult {
  const [mode, setMode] = useState<ChatDockMode>(initialMode);

  useEffect(() => {
    if (mode === "closed") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMode("closed");
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode]);

  const open = useCallback(() => setMode((current) => (current === "closed" ? "docked" : current)), []);
  const close = useCallback(() => setMode("closed"), []);
  const expand = useCallback(() => setMode("fullpage"), []);
  const collapse = useCallback(() => setMode((current) => (current === "closed" ? current : "docked")), []);
  const toggle = useCallback(() => setMode((current) => (current === "closed" ? "docked" : "closed")), []);

  return { mode, isOpen: mode !== "closed", setMode, open, close, expand, collapse, toggle };
}
