import { useEffect } from "react";
import type { GlobalProvider } from "@ladle/react";

import "../src/styles.css";

// Ladle's theme addon tracks light/dark/auto for its own UI chrome; it does
// not touch the page by default. This provider is the wire from that toggle
// to the actual Corbits tokens: `.dark` on `<html>` is what `src/theme.css`
// keys every dark-mode value off, so flipping the addon has to flip that
// class for a story to render the real theme rather than just Ladle's canvas
// colour.
const Provider: GlobalProvider = ({ globalState, children }) => {
  useEffect(() => {
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    const isDark =
      globalState.theme === "dark" ||
      (globalState.theme === "auto" && prefersDark);
    document.documentElement.classList.toggle("dark", isDark);
    // theme.css now follows the OS when neither class is set, so "light" must
    // be pinned explicitly — removing `.dark` alone still renders dark on a
    // dark-OS dev box.
    document.documentElement.classList.toggle(
      "light",
      globalState.theme === "light",
    );
  }, [globalState.theme]);

  return children;
};

export default Provider;
