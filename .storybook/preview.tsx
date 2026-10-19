import type { Decorator, Preview } from "@storybook/react-vite";

import "../src/styles.css";

// Flip the real `.dark`/`.light` class on `<html>` that `src/theme.css` keys
// off, during render so a story's first paint uses the selected theme. Light
// is pinned with `.light`: with neither class the tokens follow the OS.
const applyTheme: Decorator = (Story, { globals }) => {
  const dark = globals["theme"] === "dark";
  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.classList.toggle("light", !dark);
  return <Story />;
};

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Theme",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: ["light", "dark"],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  decorators: [applyTheme],
};

export default preview;
