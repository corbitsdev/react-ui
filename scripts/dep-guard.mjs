// Three import rules that types alone cannot enforce. Each one is a property a
// consumer would feel and no other step in the build would notice.
//
// 1. Nothing imports from @workbench/*. corbits-ui is a clean rewrite; a single
//    leaked import would drag the old package back in.
//
// 2. Only lib/tanstack-data-port.ts imports @tanstack/react-query. That module
//    is one implementation of the DataPort seam, and keeping it the sole
//    importer is what lets the query library stay an *optional* peer
//    dependency.
//
// 3. Nothing reachable from the root barrel imports an optional peer. This is
//    rule 2's real point, and rule 2 alone does not cover it: the barrel is a
//    single module, so re-exporting the adapter from index.ts loads it on *any*
//    root import and crashes for every consumer who did not install the peer —
//    while rule 2 stays green, because the adapter is still the only file with
//    the import. That is exactly the bug this rule was added to catch.
//
//    Only Node and Vite surface it; a Turbopack consumer builds cleanly, so
//    this cannot be left to whichever bundler the person testing happened to
//    use.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = new URL("../src", import.meta.url).pathname;

const OPTIONAL_PEERS = ["@tanstack/react-query"];

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

const sources = walk(ROOT).filter((path) => /\.tsx?$/.test(path));
const read = (path) => readFileSync(path, "utf8");
const id = (path) => relative(ROOT, path);

// --- Rules 1 and 2: who imports what ---------------------------------------

const violations = sources.flatMap((path) => {
  const source = read(path);
  return RULES.filter((rule) => !rule.allow(id(path))).flatMap((rule) =>
    [...source.matchAll(rule.pattern)].map((match) => `${id(path)}: imports ${match[1]}`),
  );
});

// --- Rule 3: what the root barrel drags in ---------------------------------

/** Source paths reachable from `entry` through relative imports. */
function reachableFrom(entry) {
  const seen = new Set();
  const queue = [entry];
  while (queue.length > 0) {
    const path = queue.pop();
    if (seen.has(path)) continue;
    seen.add(path);
    for (const [, spec] of read(path).matchAll(/from\s*["'](\.[^"']*)["']/g)) {
      // Source is written with `.js` specifiers; resolve back to the `.ts(x)`.
      const base = resolve(dirname(path), spec).replace(/\.js$/, "");
      const target = [`${base}.ts`, `${base}.tsx`].find(
        (candidate) => sources.includes(candidate) && candidate,
      );
      if (target) queue.push(target);
    }
  }
  return seen;
}

const barrel = join(ROOT, "index.ts");
if (!sources.includes(barrel)) {
  console.error("dep-guard: src/index.ts is missing — run `npm run generate` first");
  process.exit(1);
}

for (const path of reachableFrom(barrel)) {
  const source = read(path);
  for (const peer of OPTIONAL_PEERS) {
    if (source.includes(`"${peer}"`)) {
      violations.push(
        `${id(path)}: imports the optional peer ${peer} and is reachable from the root barrel — ` +
          `add it to BARREL_EXCLUDED in scripts/generate-exports.mjs`,
      );
    }
  }
}

if (violations.length > 0) {
  console.error(`dep-guard: forbidden imports\n${[...new Set(violations)].join("\n")}`);
  process.exit(1);
}
console.log(
  `dep-guard: clean (${RULES.map((rule) => rule.label).join(", ")}; ` +
    `root barrel free of ${OPTIONAL_PEERS.join(", ")})`,
);
