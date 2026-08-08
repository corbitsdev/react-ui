/** @type {import('@ladle/react').UserConfig} */
export default {
  stories: "stories/**/*.stories.{ts,tsx}",
  viteConfig: "vite.ladle.config.mjs",
  addons: {
    // Ladle's own light/dark toggle drives `GlobalProvider` below, which
    // applies the real `.dark` class from `src/theme.css` — not just the
    // canvas colour Ladle would otherwise switch on its own.
    theme: { enabled: true, defaultState: "light" },
    // No control panel: every story argues its own state through separate
    // exports rather than knobs, so the control addon has nothing to drive.
    control: { enabled: false },
  },
};
