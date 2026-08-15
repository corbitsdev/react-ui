import { ThemeProvider } from "../../src/ui/theme-provider.js";
import { ThemeToggle } from "../../src/ui/theme-toggle.js";

export default { title: "Primitives / Theme toggle" };

export const Interactive = () => (
  <ThemeProvider storageKey="ladle-theme-toggle-story" defaultMode="light">
    <ThemeToggle />
  </ThemeProvider>
);
