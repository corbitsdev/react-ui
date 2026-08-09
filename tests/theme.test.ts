import { describe, expect, test } from "bun:test";

import {
  applyThemeToRoot,
  nextThemeMode,
  parseThemePreference,
  resolveThemeMode,
  serializeThemePreference,
} from "../src/lib/theme.js";

describe("resolveThemeMode", () => {
  test("light and dark ignore the system preference", () => {
    expect(resolveThemeMode("light", true)).toBe("light");
    expect(resolveThemeMode("dark", false)).toBe("dark");
  });

  test("system follows prefers-color-scheme", () => {
    expect(resolveThemeMode("system", true)).toBe("dark");
    expect(resolveThemeMode("system", false)).toBe("light");
  });
});

describe("nextThemeMode", () => {
  test("cycles system → light → dark → system", () => {
    expect(nextThemeMode("system")).toBe("light");
    expect(nextThemeMode("light")).toBe("dark");
    expect(nextThemeMode("dark")).toBe("system");
  });
});

describe("parseThemePreference", () => {
  const fallback = { mode: "system" as const, preset: "default" as const };

  test("returns fallback for null or empty", () => {
    expect(parseThemePreference(null, fallback)).toEqual(fallback);
    expect(parseThemePreference("", fallback)).toEqual(fallback);
  });

  test("parses a stored preference object", () => {
    expect(
      parseThemePreference(
        JSON.stringify({ mode: "dark", preset: "warm" }),
        fallback,
      ),
    ).toEqual({ mode: "dark", preset: "warm" });
  });

  test("accepts a legacy bare mode string", () => {
    expect(parseThemePreference("light", fallback)).toEqual({
      mode: "light",
      preset: "default",
    });
  });

  test("falls back on invalid JSON and unknown fields", () => {
    expect(parseThemePreference("{not json", fallback)).toEqual(fallback);
    expect(
      parseThemePreference(
        JSON.stringify({ mode: "neon", preset: "disco" }),
        fallback,
      ),
    ).toEqual(fallback);
  });
});

describe("serializeThemePreference", () => {
  test("round-trips through parse", () => {
    const preference = { mode: "dark" as const, preset: "cool" as const };
    expect(
      parseThemePreference(serializeThemePreference(preference), {
        mode: "system",
        preset: "default",
      }),
    ).toEqual(preference);
  });
});

describe("applyThemeToRoot", () => {
  test("toggles dark class, data-theme, and color-scheme", () => {
    const root = document.createElement("div");
    applyThemeToRoot(root, "dark", "warm");
    expect(root.classList.contains("dark")).toBe(true);
    expect(root.getAttribute("data-theme")).toBe("warm");
    expect(root.style.colorScheme).toBe("dark");

    applyThemeToRoot(root, "light", "default");
    expect(root.classList.contains("dark")).toBe(false);
    expect(root.hasAttribute("data-theme")).toBe(false);
    expect(root.style.colorScheme).toBe("light");
  });
});
