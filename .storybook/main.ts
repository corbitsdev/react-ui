import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  // Stories argue state through separate exports, not knobs.
  features: { controls: false },
  framework: {
    name: "@storybook/react-vite",
    options: { builder: { viteConfigPath: "vite.stories.config.mjs" } },
  },
  core: {
    disableTelemetry: true,
    // Reachable through a tailnet proxy; Storybook overrides Vite's
    // `server.allowedHosts`, so this lives here rather than in the Vite config.
    allowedHosts: [".ts.net"],
  },
};

export default config;
