import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { useListSelection } from "./use-list-selection.js";
import type { UseListSelectionResult } from "./use-list-selection.js";

const IDS = ["a", "b", "c", "d", "e"] as const;

function mountSelection(ids: readonly string[] = IDS) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let result: UseListSelectionResult<string>;

  function Host() {
    result = useListSelection({ ids });
    return null;
  }

  act(() => {
    root.render(createElement(Host));
  });

  return {
    get: () => result,
    toggle: (id: string, modifiers?: { shiftKey?: boolean }) => act(() => result.toggle(id, modifiers)),
    selectAll: () => act(() => result.selectAll()),
    clear: () => act(() => result.clear()),
    unmount: () => act(() => root.unmount()),
  };
}

describe("useListSelection", () => {
  test("starts with nothing selected", () => {
    const s = mountSelection();
    expect(s.get().selectedCount).toBe(0);
    expect(s.get().isSelected("a")).toBe(false);
    s.unmount();
  });

  test("toggle selects, and toggling again deselects", () => {
    const s = mountSelection();
    s.toggle("b");
    expect(s.get().isSelected("b")).toBe(true);
    expect(s.get().selectedCount).toBe(1);
    s.toggle("b");
    expect(s.get().isSelected("b")).toBe(false);
    expect(s.get().selectedCount).toBe(0);
    s.unmount();
  });

  test("cmd/ctrl-click is a plain toggle that leaves the rest of the selection alone", () => {
    const s = mountSelection();
    s.toggle("a");
    s.toggle("c");
    expect(s.get().selectedIds).toEqual(new Set(["a", "c"]));
    s.unmount();
  });

  test("shift-click selects the range from the last plain toggle through the clicked row", () => {
    const s = mountSelection();
    s.toggle("b");
    s.toggle("d", { shiftKey: true });
    expect(s.get().selectedIds).toEqual(new Set(["b", "c", "d"]));
    s.unmount();
  });

  test("a reversed shift-click range (clicking above the anchor) selects the same span", () => {
    const s = mountSelection();
    s.toggle("d");
    s.toggle("b", { shiftKey: true });
    expect(s.get().selectedIds).toEqual(new Set(["b", "c", "d"]));
    s.unmount();
  });

  test("re-anchoring: a plain toggle after a range moves the anchor for the next shift-click", () => {
    const s = mountSelection();
    s.toggle("a");
    s.toggle("c", { shiftKey: true }); // range a..c
    s.toggle("e"); // plain toggle re-anchors at e, also selects e
    s.toggle("d", { shiftKey: true }); // ranges from e down to d
    expect(s.get().selectedIds).toEqual(new Set(["a", "b", "c", "e", "d"]));
    s.unmount();
  });

  test("repeated shift-clicks in different directions always range from the same anchor", () => {
    const s = mountSelection();
    s.toggle("c"); // anchor = c
    s.toggle("e", { shiftKey: true }); // range c..e
    expect(s.get().selectedIds).toEqual(new Set(["c", "d", "e"]));
    s.toggle("a", { shiftKey: true }); // still anchored at c, ranges a..c
    expect(s.get().selectedIds).toEqual(new Set(["a", "b", "c"]));
    s.unmount();
  });

  test("toggling a row already inside a selected range only removes that row", () => {
    const s = mountSelection();
    s.toggle("a");
    s.toggle("d", { shiftKey: true }); // a,b,c,d selected
    s.toggle("b"); // plain toggle inside the range
    expect(s.get().selectedIds).toEqual(new Set(["a", "c", "d"]));
    s.unmount();
  });

  test("shift-click with no prior anchor falls back to a plain toggle", () => {
    const s = mountSelection();
    s.toggle("b", { shiftKey: true });
    expect(s.get().selectedIds).toEqual(new Set(["b"]));
    s.unmount();
  });

  test("selectAll selects every id in the list", () => {
    const s = mountSelection();
    s.selectAll();
    expect(s.get().selectedIds).toEqual(new Set(IDS));
    expect(s.get().selectedCount).toBe(5);
    s.unmount();
  });

  test("clear empties the selection and resets the anchor", () => {
    const s = mountSelection();
    s.toggle("a");
    s.toggle("c", { shiftKey: true });
    s.clear();
    expect(s.get().selectedCount).toBe(0);
    // With the anchor reset, a shift-click with nothing selected behaves as
    // a plain toggle rather than ranging from the old anchor.
    s.toggle("d", { shiftKey: true });
    expect(s.get().selectedIds).toEqual(new Set(["d"]));
    s.unmount();
  });

  test("a shift-click ranging over a single row (anchor === target) selects just that row", () => {
    const s = mountSelection();
    s.toggle("b");
    s.toggle("b", { shiftKey: true });
    expect(s.get().selectedIds).toEqual(new Set(["b"]));
    s.unmount();
  });

  test("shift-clicking an id no longer in the known list falls back to a plain toggle", () => {
    const s = mountSelection(["a", "b", "c"]);
    s.toggle("a");
    s.toggle("missing", { shiftKey: true });
    expect(s.get().selectedIds).toEqual(new Set(["a", "missing"]));
    s.unmount();
  });
});
