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
    details: () => container.querySelector("details"),
    summary: () => container.querySelector("summary"),
    body: () => container.querySelector("details > p"),
    unmount: () => act(() => root.unmount()),
  };
}

describe("ReasoningBlock", () => {
  test("renders nothing for empty reasoning text", () => {
    const { details, unmount } = mount({ text: "   " });
    expect(details()).toBeNull();
    unmount();
  });

  test("is collapsed by default and opens via the details toggle", () => {
    const { details, summary, body, unmount } = mount({ text: "Weighing two options." });
    expect(details()?.hasAttribute("open")).toBe(false);
    expect(body()).toBeTruthy();

    const el = details() as HTMLDetailsElement;
    act(() => {
      el.open = true;
      el.dispatchEvent(new Event("toggle"));
    });

    expect(details()?.hasAttribute("open")).toBe(true);
    expect(body()?.textContent).toBe("Weighing two options.");
    expect(summary()).toBeTruthy();
    unmount();
  });

  test("shows the duration label once idle, and \"Thinking…\" while streaming", () => {
    const idle = mount({ text: "Done thinking.", durationLabel: "Thought for 4s" });
    expect(idle.summary()?.textContent).toBe("Thought for 4s");
    idle.unmount();

    const streaming = mount({ text: "Still going.", streaming: true, durationLabel: "Thought for 4s" });
    expect(streaming.summary()?.textContent).toBe("Thinking…");
    streaming.unmount();
  });

  test("idle without a duration label uses Thinking, not a cute fallback", () => {
    const idle = mount({ text: "Done thinking." });
    expect(idle.summary()?.textContent).toBe("Thinking");
    expect(idle.summary()?.textContent).not.toContain("Thought about this");
    idle.unmount();
  });

  test("controlled open state reports toggles through onOpenChange", () => {
    let seen: boolean | undefined;
    const { details, unmount } = mount({
      text: "Controlled.",
      open: true,
      onOpenChange: (next) => {
        seen = next;
      },
    });
    expect(details()?.hasAttribute("open")).toBe(true);

    const el = details() as HTMLDetailsElement;
    act(() => {
      el.open = false;
      el.dispatchEvent(new Event("toggle"));
    });

    expect(seen).toBe(false);
    unmount();
  });
});
