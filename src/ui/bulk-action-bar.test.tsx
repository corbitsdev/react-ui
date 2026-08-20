import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { BulkActionBar } from "./bulk-action-bar.js";

function mount(count: number, onClear: () => void) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(BulkActionBar, { count, onClear, children: createElement("button", null, "Archive") }));
  });
  return {
    toolbar: () => container.querySelector("[role='toolbar']"),
    container,
    rerender: (nextCount: number) =>
      act(() => {
        root.render(
          createElement(BulkActionBar, { count: nextCount, onClear, children: createElement("button", null, "Archive") }),
        );
      }),
    unmount: () => act(() => root.unmount()),
  };
}

describe("BulkActionBar", () => {
  test("renders nothing when count is 0", () => {
    const { toolbar, unmount } = mount(0, () => {});
    expect(toolbar()).toBeNull();
    unmount();
  });

  test("shows the count and its children once count > 0", () => {
    const { toolbar, container, unmount } = mount(3, () => {});
    expect(toolbar()?.textContent).toContain("3 selected");
    expect(container.querySelector("button")).not.toBeNull();
    unmount();
  });

  test("Escape clears the selection while the bar is showing", () => {
    let cleared = false;
    const { unmount } = mount(2, () => {
      cleared = true;
    });
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(cleared).toBe(true);
    unmount();
  });

  test("Escape does nothing once the selection is already empty", () => {
    let cleared = false;
    const { rerender, unmount } = mount(2, () => {
      cleared = true;
    });
    rerender(0);
    act(() => {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(cleared).toBe(false);
    unmount();
  });
});
