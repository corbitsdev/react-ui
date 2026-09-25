import { defineConfig, devices } from "@playwright/test";

// Serves `host/`, which installs the packed tarball `bun run test:e2e` writes.
export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  reporter: "list",
  // Screenshots are text-free token swatches, so one baseline serves every OS.
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  use: { baseURL: "http://localhost:4173" },
  projects: [{ name: "chromium", use: devices["Desktop Chrome"] }],
  webServer: {
    // bun keeps a stale copy of a rewritten local tarball unless both go, so
    // the host pins exact versions instead of committing a lockfile.
    command: "rm -rf bun.lock node_modules/@corbits && bun install && bun run typecheck && bun run dev",
    cwd: "host",
    url: "http://localhost:4173/smoke",
    reuseExistingServer: false,
  },
});
