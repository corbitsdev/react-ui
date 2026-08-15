import { useCallback, useState } from "react";

import type { ViewMode } from "../ui/view-toggle.js";

function readStoredMode(storageKey: string, fallback: ViewMode): ViewMode {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw === "grid" || raw === "rows" ? raw : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredMode(storageKey: string, mode: ViewMode): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, mode);
  } catch {
    // Quota / private mode — the choice still applies for this session.
  }
}

export type UseViewModeResult = {
  readonly mode: ViewMode;
  readonly setMode: (mode: ViewMode) => void;
};

/**
 * A page's Grid/Rows preference (see `ViewToggle`), persisted to
 * `localStorage` under a caller-supplied key so distinct pages can each keep
 * their own choice.
 *
 * Storage-backed rather than lifted to the host on purpose: this is the same
 * kind of "outlives the session" UI preference `ThemeProvider` owns, and a
 * host that wants server-persisted view modes swaps this hook for its own
 * without touching `ViewToggle`, which takes `mode` through props either way.
 */
export function useViewMode(storageKey: string, defaultMode: ViewMode = "grid"): UseViewModeResult {
  const [mode, setModeState] = useState<ViewMode>(() => readStoredMode(storageKey, defaultMode));

  const setMode = useCallback(
    (next: ViewMode) => {
      setModeState(next);
      writeStoredMode(storageKey, next);
    },
    [storageKey],
  );

  return { mode, setMode };
}
