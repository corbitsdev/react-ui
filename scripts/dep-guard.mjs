// Three source rules that types alone cannot enforce. Each one is a property a
// consumer would feel and no other step in the build would notice.
//
// 1. Nothing imports from @workbench/*. corbits-ui is a clean rewrite; a single
//    leaked import would drag the old package back in.
//
// 2. Nothing reachable from the root barrel imports an optional peer. The
//    barrel is a single module, so re-exporting a module that statically
//    imports an optional peer loads it on *any* root import and crashes for
//    every consumer who did not install that peer.
//
//    Only Node and Vite surface it; a Turbopack consumer builds cleanly, so
//    this cannot be left to whichever bundler the person testing happened to
//    use.
//
// 3. A `ui/` or `blocks/` component starts with "use client" exactly when it
//    calls a hook, creates a context, defines an inline event handler, or
//    imports an optional peer. Missing, it breaks React Server Components
//    consumers; extra, it makes a stateless component client-only for no
//    reason. After a build, the emitted dist/ module must keep the directive.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const ROOT = new URL("../src", import.meta.url).pathname;

const PKG = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const OPTIONAL_PEERS = Object.keys(PKG.peerDependenciesMeta).filter(
  (peer) => PKG.peerDependenciesMeta[peer].optional,
);

const RULES = [
  { label: "@workbench/*", pattern: /["'](@workbench\/[^"']*)["']/g, allow: () => false },
];

const walk = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

const sources = walk(ROOT).filter((path) => /\.tsx?$/.test(path));
const read = (path) => readFileSync(path, "utf8");
const id = (path) => relative(ROOT, path);

// --- Rule 1: who imports what ----------------------------------------------

const violations = sources.flatMap((path) => {
  const source = read(path);
  return RULES.filter((rule) => !rule.allow(id(path))).flatMap((rule) =>
    [...source.matchAll(rule.pattern)].map((match) => `${id(path)}: imports ${match[1]}`),
  );
});

// --- Rule 2: what the root barrel drags in ---------------------------------

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
  console.error("dep-guard: src/index.ts is missing — run `bun run generate` first");
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

// --- Rule 3: client boundaries ------------------------------------------------

const CLIENT_ONLY = new RegExp(
  [
    String.raw`\buse[A-Z]\w*\s*[<(]`,
    "createContext",
    String.raw`\bon[A-Z]\w*=\{\s*(\(|\w+\s*=>)`,
    `["'](${OPTIONAL_PEERS.map((peer) => peer.replace("/", "\\/")).join("|")})["']`,
  ].join("|"),
);
const DIST = new URL("../dist", import.meta.url).pathname;
const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm, "$1");

for (const path of sources) {
  if (!/^(ui|blocks)\//.test(id(path)) || /\.test\.tsx?$/.test(path)) continue;
  const source = read(path);
  const marked = source.startsWith('"use client";');
  if (CLIENT_ONLY.test(stripComments(source)) !== marked) {
    violations.push(`${id(path)}: ${marked ? "stateless but marked" : "stateful but missing"} "use client"`);
  }
  const built = join(DIST, id(path).replace(/\.tsx?$/, ".js"));
  if (marked && existsSync(built) && !read(built).startsWith('"use client";')) {
    violations.push(`${id(path)}: the build dropped "use client" from ${relative(DIST, built)}`);
  }
}

if (violations.length > 0) {
  console.error(`dep-guard: forbidden imports\n${[...new Set(violations)].join("\n")}`);
  process.exit(1);
}
console.log(
  `dep-guard: clean (${RULES.map((rule) => rule.label).join(", ")}; ` +
    `root barrel free of ${OPTIONAL_PEERS.join(", ")}; client boundaries match)`,
);
