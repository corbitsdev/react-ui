import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import type { ComponentProps } from "react";
import { createRoot } from "react-dom/client";

import { ReasoningBlock } from "./reasoning-block.js";

function mount(props: ComponentProps<typeof ReasoningBlock>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(ReasoningBlock, props));
  });
  return {
    button: () => container.querySelector("button") as HTMLButtonElement,
    region: () => container.querySelector('[role="region"]'),
    unmount: () => act(() => root.unmount()),
  };
}

describe("ReasoningBlock", () => {
  test("renders nothing for empty reasoning text", () => {
    const { button, unmount } = mount({ text: "   " });
    expect(button()).toBeNull();
    unmount();
  });

  test("is collapsed by default and toggles open on click", () => {
    const { button, region, unmount } = mount({ text: "Weighing two options." });
    expect(button().getAttribute("aria-expanded")).toBe("false");
    expect(region()).toBeNull();

    act(() => {
      button().dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });

    expect(button().getAttribute("aria-expanded")).toBe("true");
    expect(region()?.textContent).toBe("Weighing two options.");
    unmount();
  });

  test("shows the duration label once idle, and \"Thinking…\" while streaming", () => {
    const idle = mount({ text: "Done thinking.", durationLabel: "Thought for 4s" });
    expect(idle.button().textContent).toBe("Thought for 4s");
    idle.unmount();

    const streaming = mount({ text: "Still going.", streaming: true, durationLabel: "Thought for 4s" });
    expect(streaming.button().textContent).toBe("Thinking…");
    streaming.unmount();
  });

  test("two mounted blocks have distinct region ids matching their toggles", () => {
    const first = mount({ text: "First thought.", defaultOpen: true });
    const second = mount({ text: "Second thought.", defaultOpen: true });

    const firstControls = first.button().getAttribute("aria-controls");
    const secondControls = second.button().getAttribute("aria-controls");

    expect(firstControls).toBeTruthy();
    expect(secondControls).toBeTruthy();
    expect(firstControls).not.toBe(secondControls);
    expect(first.region()?.id ?? null).toBe(firstControls);
    expect(second.region()?.id ?? null).toBe(secondControls);

    first.unmount();
    second.unmount();
  });
});
