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
    group: () => container.querySelector("[role='group']"),
    // The outer element that owns the fixed positioning and the permanent
    // horizontal-centering transform — distinct from the inner element the
    // entrance animation plays on.
    positioningWrapper: () => container.firstElementChild as HTMLElement | null,
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
    const { group, unmount } = mount(0, () => {});
    expect(group()).toBeNull();
    unmount();
  });

  test("shows the count and its children once count > 0", () => {
    const { group, container, unmount } = mount(3, () => {});
    expect(group()?.textContent).toContain("3 selected");
    expect(container.querySelector("button")).not.toBeNull();
    unmount();
  });

  test("is a labelled group, not an unmanaged toolbar", () => {
    const { group, unmount } = mount(1, () => {});
    expect(group()?.getAttribute("aria-label")).toBe("Bulk actions");
    unmount();
  });

  test("a custom label overrides the default accessible name", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(
        createElement(BulkActionBar, {
          count: 1,
          onClear: () => {},
          label: "Actions for 1 selected artifact",
          children: createElement("button", null, "Archive"),
        }),
      );
    });
    expect(container.querySelector("[role='group']")?.getAttribute("aria-label")).toBe(
      "Actions for 1 selected artifact",
    );
    act(() => root.unmount());
  });

  test("the count label is announced via aria-live", () => {
    const { container, unmount } = mount(2, () => {});
    expect(container.querySelector("[aria-live='polite']")?.textContent).toBe("2 selected");
    unmount();
  });

  test("the outer positioning wrapper is a separate element from the animated group, and stays centered", () => {
    const { positioningWrapper, group, unmount } = mount(1, () => {});
    expect(positioningWrapper()).not.toBeNull();
    expect(positioningWrapper()).not.toBe(group());
    expect(positioningWrapper()?.className).toContain("-translate-x-1/2");
    // The centering class is unconditional — not gated behind `motion-safe:`
    // — so a reduced-motion viewer (who never runs the entrance animation
    // at all) still ends up centered rather than pinned at the midpoint.
    expect(positioningWrapper()?.className).not.toContain("motion-safe:-translate-x-1/2");
    expect(group()?.className).not.toContain("translate-x");
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

  test("Escape defers to a handler above it that already prevented the default", () => {
    let cleared = false;
    const { unmount } = mount(2, () => {
      cleared = true;
    });
    act(() => {
      const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
      // Simulates a dialog/input above the bar that already claimed this
      // Escape press before it reaches the bar's window listener.
      window.addEventListener("keydown", (e) => e.preventDefault(), { once: true, capture: true });
      window.dispatchEvent(event);
    });
    expect(cleared).toBe(false);
    unmount();
  });
});
