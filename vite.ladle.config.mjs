// Vite config for the component workbench only. Ladle discovers this file by
// name and merges it into its own dev/build config; it never touches
// `bun run build`, which does not go through Vite at all.
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss()],
  server: {
    // A leading dot allows any host under the suffix, so the workbench
    // stays reachable through a tailnet proxy (tailscale serve/funnel)
    // on any machine without naming one — while keeping Vite's host
    // check (a DNS-rebinding guard) active for every other origin.
    allowedHosts: [".ts.net"],
  },
});
