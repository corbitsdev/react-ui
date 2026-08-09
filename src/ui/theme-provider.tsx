import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_THEME_STORAGE_KEY,
  applyThemeToRoot,
  nextThemeMode,
  parseThemePreference,
  resolveThemeMode,
  serializeThemePreference,
  type ResolvedThemeMode,
  type ThemeMode,
  type ThemePreset,
  type ThemePreference,
} from "../lib/theme.js";

export type ThemeContextValue = {
  readonly mode: ThemeMode;
  readonly setMode: (mode: ThemeMode) => void;
  readonly cycleMode: () => void;
  readonly resolvedMode: ResolvedThemeMode;
  readonly preset: ThemePreset;
  readonly setPreset: (preset: ThemePreset) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readSystemPrefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function readStoredPreference(
  storageKey: string,
  fallback: ThemePreference,
): ThemePreference {
  if (typeof window === "undefined") return fallback;
  try {
    return parseThemePreference(window.localStorage.getItem(storageKey), fallback);
  } catch {
    return fallback;
  }
}

function writeStoredPreference(storageKey: string, preference: ThemePreference): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, serializeThemePreference(preference));
  } catch {
    // Quota / private mode — preference still applies for this session.
  }
}

export type ThemeProviderProps = {
  readonly children: ReactNode;
  /**
   * localStorage key. Hosts that persist per user should pass a key that
   * includes the user id (e.g. `corbits-theme:user_1`).
   */
  readonly storageKey?: string;
  readonly defaultMode?: ThemeMode;
  readonly defaultPreset?: ThemePreset;
  /**
   * Element that receives `.dark`, `data-theme`, and `color-scheme`.
   * Defaults to `document.documentElement`.
   */
  readonly root?: Element | null;
};

/**
 * Owns light/dark/system mode and named preset overlays for the Corbits theme.
 *
 * The host mounts this once near the root and keys `storageKey` by user when
 * signed in. Mode is applied as `.dark` on the root (see theme.css); presets
 * as `data-theme`. Components never import storage — they call `useTheme`.
 */
export function ThemeProvider({
  children,
  storageKey = DEFAULT_THEME_STORAGE_KEY,
  defaultMode = "system",
  defaultPreset = "default",
  root = null,
}: ThemeProviderProps) {
  const fallback = useMemo<ThemePreference>(
    () => ({ mode: defaultMode, preset: defaultPreset }),
    [defaultMode, defaultPreset],
  );

  const [preference, setPreference] = useState<ThemePreference>(() =>
    readStoredPreference(storageKey, fallback),
  );
  const [systemPrefersDark, setSystemPrefersDark] = useState(readSystemPrefersDark);

  // Re-read when the host changes the storage key (e.g. user signs in).
  useEffect(() => {
    setPreference(readStoredPreference(storageKey, fallback));
  }, [storageKey, fallback]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemPrefersDark(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolvedMode = resolveThemeMode(preference.mode, systemPrefersDark);

  useEffect(() => {
    const target =
      root ?? (typeof document !== "undefined" ? document.documentElement : null);
    if (target === null) return;
    applyThemeToRoot(target, resolvedMode, preference.preset);
  }, [root, resolvedMode, preference.preset]);

  const setMode = useCallback(
    (mode: ThemeMode) => {
      setPreference((current) => {
        const next = { mode, preset: current.preset };
        writeStoredPreference(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const setPreset = useCallback(
    (preset: ThemePreset) => {
      setPreference((current) => {
        const next = { mode: current.mode, preset };
        writeStoredPreference(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const cycleMode = useCallback(() => {
    setMode(nextThemeMode(preference.mode));
  }, [preference.mode, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode: preference.mode,
      setMode,
      cycleMode,
      resolvedMode,
      preset: preference.preset,
      setPreset,
    }),
    [preference.mode, preference.preset, setMode, cycleMode, resolvedMode, setPreset],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (value === null) {
    throw new Error(
      "No ThemeProvider in scope — wrap the tree in <ThemeProvider>.",
    );
  }
  return value;
}
