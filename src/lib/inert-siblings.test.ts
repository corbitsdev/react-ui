import { describe, expect, test } from "bun:test";

import { inertSiblings } from "./inert-siblings.js";

function row(...names: string[]): HTMLElement {
  const parent = document.createElement("div");
  for (const name of names) {
    const child = document.createElement("div");
    child.dataset["name"] = name;
    parent.appendChild(child);
  }
  return parent;
}

function child(parent: HTMLElement, name: string): HTMLElement {
  const found = parent.querySelector<HTMLElement>(`[data-name='${name}']`);
  if (found === null) throw new Error(`no child named ${name}`);
  return found;
}

describe("inertSiblings", () => {
  test("makes every sibling inert but not the element itself", () => {
    const parent = row("before", "panel", "after");
    inertSiblings(child(parent, "panel"));
    expect(child(parent, "before").hasAttribute("inert")).toBe(true);
    expect(child(parent, "after").hasAttribute("inert")).toBe(true);
    expect(child(parent, "panel").hasAttribute("inert")).toBe(false);
  });

  test("restoring lifts the inertness it added", () => {
    const parent = row("main", "panel");
    const restore = inertSiblings(child(parent, "panel"));
    restore();
    expect(child(parent, "main").hasAttribute("inert")).toBe(false);
  });

  test("a sibling that was already inert stays inert after restoring", () => {
    const parent = row("main", "rail", "panel");
    child(parent, "rail").setAttribute("inert", "");
    const restore = inertSiblings(child(parent, "panel"));
    restore();
    expect(child(parent, "main").hasAttribute("inert")).toBe(false);
    expect(child(parent, "rail").hasAttribute("inert")).toBe(true);
  });

  test("an element with no parent changes nothing", () => {
    const restore = inertSiblings(document.createElement("div"));
    expect(restore).not.toThrow();
  });
});
