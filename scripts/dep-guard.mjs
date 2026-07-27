// Two import rules that types alone cannot enforce.
//
// 1. Nothing imports from @workbench/*. corbits-ui is a clean rewrite; a single
//    leaked import would drag the old package back in.
// 2. Only lib/tanstack-data-port.ts imports @tanstack/react-query. That module
//    is one implementation of the DataPort seam, and keeping it the sole
//    importer is what lets the query library stay an *optional* peer
//    dependency. A component reaching past the seam would quietly make it
//    required for every consumer, and nothing else would fail.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("../src", import.meta.url).pathname;

const RULES = [
  { label: "@workbench/*", pattern: /["'](@workbench\/[^"']*)["']/g, allow: () => false },
  {
    label: "@tanstack/react-query",
    pattern: /["'](@tanstack\/react-query)["']/g,
    allow: (file) => file === "lib/tanstack-data-port.ts",
  },
];

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const violations = walk(ROOT)
  .filter((path) => /\.tsx?$/.test(path))
  .flatMap((path) => {
    const id = relative(ROOT, path);
    const source = readFileSync(path, "utf8");
    return RULES.filter((rule) => !rule.allow(id)).flatMap((rule) =>
      [...source.matchAll(rule.pattern)].map((match) => `${id}: imports ${match[1]}`),
    );
  });

if (violations.length > 0) {
  console.error(`dep-guard: forbidden imports\n${[...new Set(violations)].join("\n")}`);
  process.exit(1);
}
console.log(`dep-guard: clean (${RULES.map((rule) => rule.label).join(", ")})`);
