import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { InfoTooltip } from "./tooltip.js";

function mount(label: string) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(InfoTooltip, { label }));
  });
  return {
    trigger: () => document.body.querySelector("button") as HTMLButtonElement,
    unmount: () => root.unmount(),
  };
}

describe("InfoTooltip", () => {
  test("the trigger is a focusable button", () => {
    const { trigger, unmount } = mount("Positioned by event order, not real timing.");
    const button = trigger();
    expect(button).not.toBeNull();
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    unmount();
  });

  test("focusing the trigger associates and reveals the tooltip content", async () => {
    const { trigger, unmount } = mount("Positioned by event order, not real timing.");
    const button = trigger();

    act(() => {
      button.focus();
    });
    // Radix opens on the next tick after a focus/pointer event.
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const describedBy = button.getAttribute("aria-describedby");
    expect(describedBy).not.toBeNull();
    const content = document.getElementById(describedBy as string);
    expect(content).not.toBeNull();
    expect(content?.textContent).toContain("Positioned by event order, not real timing.");
    unmount();
  });

  test("Escape dismisses the tooltip", async () => {
    const { trigger, unmount } = mount("Positioned by event order, not real timing.");
    const button = trigger();

    act(() => {
      button.focus();
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(button.getAttribute("aria-describedby")).not.toBeNull();

    act(() => {
      button.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const describedBy = button.getAttribute("aria-describedby");
    if (describedBy !== null) {
      expect(document.getElementById(describedBy)).toBeNull();
    }
    unmount();
  });
});
