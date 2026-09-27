import { defineConfig, devices } from "@playwright/test";

// Serves the Vite host e2e/helpers.ts bootstraps from the packed tarball.
export default defineConfig({
  testDir: "e2e",
  testMatch: "*.spec.ts",
  reporter: "list",
  globalTeardown: "./e2e/teardown.ts",
  use: { baseURL: "http://localhost:4173" },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  webServer: {
    command: "bun e2e/helpers.ts",
    url: "http://localhost:4173/smoke",
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
