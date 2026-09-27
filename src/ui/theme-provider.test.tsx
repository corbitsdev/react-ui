import { afterEach, expect, test } from "bun:test";
import { act, createElement } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import {
  DEFAULT_THEME_STORAGE_KEY,
  serializeThemePreference,
} from "../lib/theme.js";
import { ThemeProvider, useTheme } from "./theme-provider.js";

afterEach(() => localStorage.clear());

function Mode() {
  const { mode, resolvedMode } = useTheme();
  return createElement("span", null, `${mode}/${resolvedMode}`);
}

test("hydrates from the server markup, then applies the stored preference", () => {
  const tree = createElement(ThemeProvider, null, createElement(Mode));
  const container = document.createElement("div");
  container.innerHTML = renderToString(tree);
  expect(container.textContent).toBe("system/light");

  localStorage.setItem(
    DEFAULT_THEME_STORAGE_KEY,
    serializeThemePreference({ mode: "dark", preset: "default" }),
  );
  const errors: unknown[] = [];
  let root: ReturnType<typeof hydrateRoot> | undefined;
  act(() => {
    root = hydrateRoot(container, tree, {
      onRecoverableError: (error) => errors.push(error),
    });
  });

  expect(errors).toEqual([]);
  expect(container.textContent).toBe("dark/dark");
  act(() => root?.unmount());
});
