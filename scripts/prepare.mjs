/**
 * `prepare` hook — builds `dist/` when the package is installed from git.
 *
 * The package publishes `dist/` only (`files`), and every entry in the
 * `exports` map points there. A registry tarball therefore arrives already
 * built, via `prepack`. A git install does not: it gets the repository, so
 * something has to build on the way in, and `prepare` is the one lifecycle
 * hook package managers run at that moment. Without it every
 * `@corbits/react-ui/...` import in the consumer resolves to a file that was
 * never generated, and the failure lands in the consumer's tree, where they
 * cannot fix it.
 *
 * Two things make this more than a one-line script:
 *
 * 1. `prepare` also runs for the *root* project on a plain `bun install` here
 *    in the repository. Building then would be wasted work at best, and
 *    recursive at worst (see 2). Being installed as a dependency is what
 *    distinguishes the two cases, and the honest signal for it is that the
 *    package directory sits inside a `node_modules` tree.
 * 2. bun does not install a git dependency's devDependencies, and the whole
 *    toolchain (swc, tsc, tailwind) is a devDependency — as it should be, a
 *    consumer must not inherit them as runtime deps. So the git-install path
 *    installs them here, scoped to this directory, immediately before the
 *    build that needs them.
 *
 * Deliberately a no-op when `dist/` is already present: repeat installs of the
 * same commit should not pay for a rebuild.
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const packageDir = dirname(dirname(fileURLToPath(import.meta.url)));

if (existsSync(join(packageDir, "dist", "index.js"))) {
  process.exit(0);
}

const installedAsDependency = packageDir.split(sep).includes("node_modules");
if (!installedAsDependency) {
  // Developing the repository itself. `bun run build` is a documented step of
  // getting set up (CONTRIBUTING.md) and stays an explicit one — a `prepare`
  // that silently ran the whole gate on every `bun install` would be a
  // surprise, and the recursive `bun install` below would be a worse one.
  process.exit(0);
}

// The toolchain install below is itself a `bun install`, run inside this very
// package directory — which sits in a `node_modules` tree, so the check above
// would call it a dependency install too and it would recurse forever. This
// marker, passed down to the child, is what breaks that cycle.
const RECURSION_GUARD = "CORBITS_REACT_UI_PREPARE";
if (process.env[RECURSION_GUARD] === "1") {
  process.exit(0);
}

function run(command, args) {
  execFileSync(command, args, {
    cwd: packageDir,
    stdio: "inherit",
    env: { ...process.env, [RECURSION_GUARD]: "1" },
  });
}

console.log("@corbits/react-ui: git install — building dist/");
run("bun", ["install"]);
run("bun", ["run", "build"]);
