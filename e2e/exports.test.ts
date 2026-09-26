import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Runs against the build: `bun run build` first.
const ROOT = join(import.meta.dir, "..");
const PKG = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
const OPTIONAL_PEERS = Object.keys(PKG.peerDependenciesMeta);

const targets = (entry: string | Record<string, string>) =>
  typeof entry === "string" ? [entry] : Object.values(entry);

describe.skipIf(!existsSync(join(ROOT, "dist/index.js")))("exports", () => {
  test("every entry resolves to a file", () => {
    const missing = Object.values(PKG.exports)
      .flatMap((entry) => targets(entry as string | Record<string, string>))
      .filter((path) => !existsSync(join(ROOT, path)));
    expect(missing).toEqual([]);
  });

  test("the root entry loads with no optional peer installed", () => {
    const script = `
      import { registerHooks } from "node:module";
      const peers = ${JSON.stringify(OPTIONAL_PEERS)};
      registerHooks({
        resolve(specifier, context, next) {
          if (peers.includes(specifier)) throw new Error("loaded optional peer " + specifier);
          return next(specifier, context);
        },
      });
      const root = await import("${PKG.name}");
      if (!root.Button) throw new Error("Button missing from the root entry");
    `;
    const run = Bun.spawnSync(["node", "--input-type=module", "-e", script], {
      cwd: ROOT,
    });
    expect(run.stderr.toString()).toBe("");
    expect(run.exitCode).toBe(0);
  });
});
