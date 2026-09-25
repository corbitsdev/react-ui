// Bootstraps the Vite host the specs drive: packs this package, installs the
// tarball into a throwaway app in a temp directory (teardown.ts removes it),
// typechecks fixtures.tsx against the packed types and serves it on :4173.
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = join(import.meta.dirname, "..");
// Outside node_modules, where Vite would skip prebundling the host's own deps.
export const host = join(tmpdir(), "react-ui-e2e-host");

const packageJson = {
  name: "react-ui-e2e-host",
  private: true,
  type: "module",
  // Exact pins instead of a lockfile: bun keeps a stale copy of a rewritten local tarball.
  dependencies: {
    "@corbits/react-ui": "file:./react-ui.tgz",
    "@radix-ui/react-dialog": "1.1.23",
    "@radix-ui/react-slot": "1.3.3",
    "lucide-react": "1.48.0",
    react: "19.3.0",
    "react-dom": "19.3.0",
  },
  devDependencies: {
    "@types/react": "19.3.0",
    "@types/react-dom": "19.3.0",
    typescript: "5.9.3",
    vite: "6.4.3",
  },
};

const tsconfig = {
  compilerOptions: {
    target: "ES2022",
    lib: ["dom", "dom.iterable", "ES2022"],
    jsx: "react-jsx",
    module: "esnext",
    moduleResolution: "bundler",
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    isolatedModules: true,
  },
  include: ["src"],
};

const viteConfig = `export default {
  esbuild: { jsx: "automatic" },
  server: { port: 4173, strictPort: true },
};
`;

const indexHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>react-ui e2e host</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`;

const mainTsx = `import "@corbits/react-ui/styles.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { scenarios } from "./fixtures.js";

const name = window.location.pathname.slice(1);
const Scenario = scenarios[name];

createRoot(document.getElementById("root")!).render(
  <StrictMode>{Scenario ? <Scenario /> : <p>Unknown scenario: {name}</p>}</StrictMode>,
);
`;

function run(cwd: string, command: string, ...args: string[]): void {
  execFileSync(command, args, { cwd, stdio: "inherit" });
}

if (import.meta.main) {
  rmSync(host, { recursive: true, force: true });
  mkdirSync(join(host, "src"), { recursive: true });
  run(root, "bun", "pm", "pack", "--quiet", "--filename", join(host, "react-ui.tgz"));
  writeFileSync(join(host, "package.json"), JSON.stringify(packageJson, null, 2));
  writeFileSync(join(host, "tsconfig.json"), JSON.stringify(tsconfig, null, 2));
  writeFileSync(join(host, "vite.config.mjs"), viteConfig);
  writeFileSync(join(host, "index.html"), indexHtml);
  writeFileSync(join(host, "src", "main.tsx"), mainTsx);
  copyFileSync(join(import.meta.dirname, "fixtures.tsx"), join(host, "src", "fixtures.tsx"));
  run(host, "bun", "install");
  run(host, "bun", "x", "tsc", "--noEmit");
  run(host, "bun", "x", "vite");
}
