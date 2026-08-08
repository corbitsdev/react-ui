// Vite config for the component workbench only. Ladle discovers this file by
// name and merges it into its own dev/build config; it never touches
// `bun run build`, which does not go through Vite at all.
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss()],
});
