import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const theme = readFileSync(join(import.meta.dir, "../src/theme.css"), "utf-8");

// One named icon-size scale, matching the owner's mock CSS 1:1, so call
// sites stop inventing their own px/rem sizes (or a `size=` prop) per spot.
describe("icon-size tokens", () => {
  test("defines exactly the four named scale steps", () => {
    expect(theme).toMatch(/--icon-size-nav:\s*0\.9375rem/);
    expect(theme).toMatch(/--icon-size-topbar:\s*1rem/);
    expect(theme).toMatch(/--icon-size-button:\s*0\.8125rem/);
    expect(theme).toMatch(/--icon-size-checkbox:\s*0\.625rem/);
  });

  test("declares the tokens once, on :root, not inside a dark-mode block", () => {
    const rootBlock = theme.slice(theme.indexOf(":root {"), theme.indexOf(":root {") + theme.slice(theme.indexOf(":root {")).indexOf("\n}"));
    expect(rootBlock).toContain("--icon-size-nav");
    expect(rootBlock).toContain("--icon-size-topbar");
    expect(rootBlock).toContain("--icon-size-button");
    expect(rootBlock).toContain("--icon-size-checkbox");
  });

  test("re-exposes each step under Tailwind's font-size namespace", () => {
    expect(theme).toMatch(/--text-icon-nav:\s*var\(--icon-size-nav\)/);
    expect(theme).toMatch(/--text-icon-topbar:\s*var\(--icon-size-topbar\)/);
    expect(theme).toMatch(/--text-icon-button:\s*var\(--icon-size-button\)/);
    expect(theme).toMatch(/--text-icon-checkbox:\s*var\(--icon-size-checkbox\)/);
  });
});
