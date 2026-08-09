/** Theme mode and preset resolution for ThemeProvider.

 * Dark mode is opt-in via a `.dark` class on an ancestor (see theme.css
 * `@custom-variant dark`). This module owns the pure resolution rules;
 * ThemeProvider applies them to the document and persists the choice.
 */

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedThemeMode = "light" | "dark";

/** Named token overlays shipped as `data-theme` values on the root. */
export type ThemePreset = "default" | "warm" | "cool";

export const THEME_MODES: readonly ThemeMode[] = ["system", "light", "dark"];
export const THEME_PRESETS: readonly ThemePreset[] = ["default", "warm", "cool"];

export const DEFAULT_THEME_STORAGE_KEY = "corbits-theme";

export type ThemePreference = {
  readonly mode: ThemeMode;
  readonly preset: ThemePreset;
};

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

export function isThemePreset(value: unknown): value is ThemePreset {
  return value === "default" || value === "warm" || value === "cool";
}

/** Resolve light/dark after consulting the system preference when mode is system. */
export function resolveThemeMode(
  mode: ThemeMode,
  systemPrefersDark: boolean,
): ResolvedThemeMode {
  if (mode === "light") return "light";
  if (mode === "dark") return "dark";
  return systemPrefersDark ? "dark" : "light";
}

export function parseThemePreference(
  raw: string | null,
  fallback: ThemePreference,
): ThemePreference {
  if (raw === null || raw.length === 0) return fallback;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return fallback;
    const record = parsed as Record<string, unknown>;
    const mode = isThemeMode(record.mode) ? record.mode : fallback.mode;
    const preset = isThemePreset(record.preset) ? record.preset : fallback.preset;
    return { mode, preset };
  } catch {
    // Legacy: a bare mode string from an earlier client.
    if (isThemeMode(raw)) return { mode: raw, preset: fallback.preset };
    return fallback;
  }
}

export function serializeThemePreference(preference: ThemePreference): string {
  return JSON.stringify({ mode: preference.mode, preset: preference.preset });
}

/** Cycle system → light → dark → system for a one-control toggle. */
export function nextThemeMode(mode: ThemeMode): ThemeMode {
  if (mode === "system") return "light";
  if (mode === "light") return "dark";
  return "system";
}

/** Apply resolved mode + preset to a root element (usually documentElement). */
export function applyThemeToRoot(
  root: Element,
  resolved: ResolvedThemeMode,
  preset: ThemePreset,
): void {
  root.classList.toggle("dark", resolved === "dark");
  if (preset === "default") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", preset);
  }
  if (root instanceof HTMLElement) {
    root.style.colorScheme = resolved;
  }
}
