import { defineConfig, devices } from "@playwright/test";

// Serves the Vite host e2e/helpers.ts bootstraps from the packed tarball, and
// the static Storybook build for the accessibility sweep.
export default defineConfig({
  testDir: "e2e",
  testMatch: "*.spec.ts",
  reporter: "list",
  globalTeardown: "./e2e/teardown.ts",
  // Screenshots are text-free token swatches, so one baseline serves every OS.
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  use: { baseURL: "http://localhost:4173" },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  webServer: [
    {
      command: "bun e2e/helpers.ts",
      url: "http://localhost:4173/smoke",
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command:
        "bun run stories:build && bunx vite preview --outDir build --port 61000 --strictPort",
      url: "http://localhost:61000/index.json",
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
