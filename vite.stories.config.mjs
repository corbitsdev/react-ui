// Vite config for the component workbench only; `.storybook/main.ts` points
// Storybook at it. It never touches `bun run build`, which does not use Vite.
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss()],
});
