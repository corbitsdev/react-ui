import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import type { ComponentProps } from "react";
import { createRoot } from "react-dom/client";

import { Select } from "./select.js";

function mount(props: ComponentProps<typeof Select>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(Select, props));
  });
  return {
    select: () => container.querySelector("select") as HTMLSelectElement,
    unmount: () => root.unmount(),
  };
}

const options = createElement("option", { value: "a" }, "A");

describe("Select", () => {
  test("renders a native select carrying passed-through props", () => {
    const { select, unmount } = mount({ value: "a", onChange: () => {}, disabled: false, children: options });
    expect(select().tagName).toBe("SELECT");
    expect(select().value).toBe("a");
    unmount();
  });

  test("disabled disables the underlying control", () => {
    const { select, unmount } = mount({ value: "a", onChange: () => {}, disabled: true, children: options });
    expect(select().disabled).toBe(true);
    unmount();
  });

  test("aria-invalid and aria-describedby pass through to the control", () => {
    const { select, unmount } = mount({
      value: "a",
      onChange: () => {},
      "aria-invalid": true,
      "aria-describedby": "field-error",
      children: options,
    });
    expect(select().getAttribute("aria-invalid")).toBe("true");
    expect(select().getAttribute("aria-describedby")).toBe("field-error");
    unmount();
  });

  test("onChange fires when the selection changes", () => {
    let received: string | undefined;
    const { select, unmount } = mount({
      value: "a",
      onChange: (event) => {
        received = event.target.value;
      },
      children: [createElement("option", { key: "a", value: "a" }, "A"), createElement("option", { key: "b", value: "b" }, "B")],
    });
    const node = select();
    act(() => {
      node.value = "b";
      node.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(received).toBe("b");
    unmount();
  });
});
