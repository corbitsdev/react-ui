import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import type { ComponentProps } from "react";
import { createRoot } from "react-dom/client";

import { SelectionCheckbox } from "./selection-checkbox.js";

function mount(props: ComponentProps<typeof SelectionCheckbox>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(SelectionCheckbox, props));
  });
  return {
    button: () => container.querySelector("button") as HTMLButtonElement,
    container,
    unmount: () => act(() => root.unmount()),
  };
}

describe("SelectionCheckbox", () => {
  test("renders a role=checkbox control named after the row", () => {
    const { button, unmount } = mount({ checked: false, onToggle: () => {}, rowLabel: '"Q3 rollup"' });
    expect(button().getAttribute("role")).toBe("checkbox");
    expect(button().getAttribute("aria-label")).toBe('Select "Q3 rollup"');
    unmount();
  });

  test("aria-checked reflects the checked prop", () => {
    const { button, unmount } = mount({ checked: true, onToggle: () => {}, rowLabel: "row" });
    expect(button().getAttribute("aria-checked")).toBe("true");
    unmount();
  });

  test("clicking calls onToggle with the click's shiftKey", () => {
    const received: boolean[] = [];
    const { button, unmount } = mount({
      checked: false,
      onToggle: ({ shiftKey }) => received.push(shiftKey),
      rowLabel: "row",
    });
    act(() => {
      button().dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));
    });
    expect(received).toEqual([true]);
    unmount();
  });

  test("Space and Enter both toggle", () => {
    let calls = 0;
    const { button, unmount } = mount({
      checked: false,
      onToggle: () => {
        calls += 1;
      },
      rowLabel: "row",
    });
    act(() => {
      button().dispatchEvent(new KeyboardEvent("keydown", { key: " ", bubbles: true, cancelable: true }));
    });
    act(() => {
      button().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    });
    expect(calls).toBe(2);
    unmount();
  });

  test("other keys do not toggle", () => {
    let calls = 0;
    const { button, unmount } = mount({
      checked: false,
      onToggle: () => {
        calls += 1;
      },
      rowLabel: "row",
    });
    act(() => {
      button().dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }));
    });
    expect(calls).toBe(0);
    unmount();
  });
});
