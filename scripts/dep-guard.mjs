// Fails if anything in the registry imports from @workbench/*. corbits-ui is a
// clean rewrite; a single leaked import would drag the old package back in.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../registry", import.meta.url).pathname;
const FORBIDDEN = /(?:from|import|require)\s*\(?\s*["'](@workbench\/[^"']+)["']/g;

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const violations = walk(ROOT)
  .filter((path) => /\.tsx?$/.test(path))
  .flatMap((path) =>
    [...readFileSync(path, "utf8").matchAll(FORBIDDEN)].map((match) => `${path}: imports ${match[1]}`),
  );

if (violations.length > 0) {
  console.error(`dep-guard: forbidden @workbench imports\n${violations.join("\n")}`);
  process.exit(1);
}
console.log("dep-guard: no @workbench imports");
