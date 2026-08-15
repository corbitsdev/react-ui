import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import type { ComponentProps } from "react";
import { createRoot } from "react-dom/client";

import { Textarea } from "./textarea.js";

function mount(props: ComponentProps<typeof Textarea>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(Textarea, props));
  });
  return {
    textarea: () => container.querySelector("textarea") as HTMLTextAreaElement,
    unmount: () => root.unmount(),
  };
}

describe("Textarea", () => {
  test("renders a native textarea with the given value", () => {
    const { textarea, unmount } = mount({ value: "hello", onChange: () => {} });
    expect(textarea().tagName).toBe("TEXTAREA");
    expect(textarea().value).toBe("hello");
    unmount();
  });

  test("disabled disables the control", () => {
    const { textarea, unmount } = mount({ disabled: true, defaultValue: "locked" });
    expect(textarea().disabled).toBe(true);
    unmount();
  });

  test("aria-invalid passes through to the control", () => {
    const { textarea, unmount } = mount({ "aria-invalid": true, defaultValue: "bad" });
    expect(textarea().getAttribute("aria-invalid")).toBe("true");
    unmount();
  });

  test("without autoResize, the control keeps a fixed height", () => {
    const { textarea, unmount } = mount({ defaultValue: "line one\nline two\nline three" });
    expect(textarea().style.height).toBe("");
    unmount();
  });

  test("autoResize sets an explicit pixel height after mount", () => {
    const { textarea, unmount } = mount({ autoResize: true, defaultValue: "line one\nline two" });
    expect(textarea().style.height.endsWith("px")).toBe(true);
    unmount();
  });

  test("autoResize recalculates height on input", () => {
    const { textarea, unmount } = mount({ autoResize: true, defaultValue: "", onChange: () => {} });
    const node = textarea();
    act(() => {
      node.value = "line one\nline two\nline three\nline four";
      node.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(node.style.height.endsWith("px")).toBe(true);
    unmount();
  });

  // React tracks `value` through its own instance setter to detect programmatic
  // changes; assigning `.value` directly is invisible to it, so `onChange` never
  // fires. Going through the native prototype setter first is what makes the
  // subsequent `input` event register as a real change.
  const nativeValueSetter = Object.getOwnPropertyDescriptor(
    globalThis.HTMLTextAreaElement.prototype,
    "value",
  )?.set;

  function setValue(node: HTMLTextAreaElement, value: string) {
    nativeValueSetter?.call(node, value);
    node.dispatchEvent(new Event("input", { bubbles: true }));
  }

  test("autoResize caps height at maxHeight and switches to scrollable overflow", () => {
    const { textarea, unmount } = mount({ autoResize: true, defaultValue: "", onChange: () => {} });
    const node = textarea();
    Object.defineProperty(node, "scrollHeight", { value: 800, configurable: true });
    act(() => {
      setValue(node, Array.from({ length: 40 }, (_, i) => `line ${i}`).join("\n"));
    });
    expect(node.style.height).toBe("200px");
    expect(node.className).toContain("overflow-y-auto");
    expect(node.className).not.toContain("overflow-hidden");
    unmount();
  });

  test("a custom maxHeight caps the resize at that value", () => {
    const { textarea, unmount } = mount({ autoResize: true, maxHeight: 80, defaultValue: "", onChange: () => {} });
    const node = textarea();
    Object.defineProperty(node, "scrollHeight", { value: 400, configurable: true });
    act(() => {
      setValue(node, "a lot of content");
    });
    expect(node.style.height).toBe("80px");
    unmount();
  });
});
