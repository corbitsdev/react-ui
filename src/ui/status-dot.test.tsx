import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import type { ComponentProps } from "react";
import { createRoot } from "react-dom/client";

import { StatusDot } from "./status-dot.js";

function mount(props: ComponentProps<typeof StatusDot>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(StatusDot, props));
  });
  return {
    dot: () => container.firstElementChild as HTMLElement,
    unmount: () => root.unmount(),
  };
}

describe("StatusDot", () => {
  test("a label makes the dot a named image", () => {
    const { dot, unmount } = mount({ label: "Running" });
    expect(dot().getAttribute("role")).toBe("img");
    expect(dot().getAttribute("aria-label")).toBe("Running");
    expect(dot().hasAttribute("aria-hidden")).toBe(false);
    unmount();
  });

  test("an empty label hides the dot instead of announcing an unnamed image", () => {
    const { dot, unmount } = mount({ label: "" });
    expect(dot().hasAttribute("role")).toBe(false);
    expect(dot().hasAttribute("aria-label")).toBe(false);
    expect(dot().getAttribute("aria-hidden")).toBe("true");
    unmount();
  });
});
