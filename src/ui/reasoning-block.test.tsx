import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import type { ComponentProps } from "react";
import { createRoot } from "react-dom/client";

import { ReasoningBlock } from "./reasoning-block.js";

function mount(initialProps: ComponentProps<typeof ReasoningBlock>) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let props = initialProps;
  act(() => {
    root.render(createElement(ReasoningBlock, props));
  });
  return {
    details: () => container.querySelector("details"),
    summary: () => container.querySelector("summary"),
    body: () => container.querySelector("details > p"),
    rerender: (next: ComponentProps<typeof ReasoningBlock>) => {
      props = next;
      act(() => {
        root.render(createElement(ReasoningBlock, props));
      });
    },
    // happy-dom delivers `toggle` on a queued task, same as real browsers.
    flushToggle: () => act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }),
    unmount: () => act(() => root.unmount()),
  };
}

describe("ReasoningBlock", () => {
  test("renders nothing for empty reasoning text", () => {
    const { details, unmount } = mount({ text: "   " });
    expect(details()).toBeNull();
    unmount();
  });

  test("is collapsed by default and opens by activating the summary", async () => {
    const { details, summary, body, flushToggle, unmount } = mount({ text: "Weighing two options." });
    expect(details()?.hasAttribute("open")).toBe(false);
    expect(body()).toBeTruthy();

    act(() => {
      summary()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushToggle();

    expect(details()?.hasAttribute("open")).toBe(true);
    expect(body()?.textContent).toBe("Weighing two options.");
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

  test("streaming-to-idle on the same instance updates the summary and busy state", () => {
    const handle = mount({ text: "Reasoning.", streaming: true });
    expect(handle.summary()?.textContent).toBe("Thinking…");
    expect(handle.body()?.getAttribute("aria-busy")).toBe("true");
    // aria-live is unconditional so the streaming-to-idle wording change is announced.
    expect(handle.summary()?.querySelector("[aria-live]")?.getAttribute("aria-live")).toBe("polite");

    handle.rerender({ text: "Reasoning.", streaming: false, durationLabel: "Thought for 4s" });

    expect(handle.summary()?.textContent).toContain("Thought for 4s");
    expect(handle.body()?.getAttribute("aria-busy")).toBe("false");
    handle.unmount();
  });

  test("uncontrolled: activating the summary reports through onOpenChange", async () => {
    const seen: boolean[] = [];
    const { details, summary, flushToggle, unmount } = mount({
      text: "Uncontrolled.",
      onOpenChange: (next) => seen.push(next),
    });

    act(() => {
      summary()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await flushToggle();

    expect(seen).toEqual([true]);
    expect(details()?.hasAttribute("open")).toBe(true);
    unmount();
  });

  test("controlled: user activation reports intent, parent-driven open does not echo", async () => {
    const seen: boolean[] = [];
    const props = (open: boolean): ComponentProps<typeof ReasoningBlock> => ({
      text: "Controlled.",
      open,
      onOpenChange: (next) => seen.push(next),
    });
    const handle = mount(props(false));
    expect(handle.details()?.hasAttribute("open")).toBe(false);

    act(() => {
      handle.summary()?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    });
    await handle.flushToggle();
    expect(seen).toEqual([true]);

    // Parent honors the request; the resulting attribute change must not echo.
    handle.rerender(props(true));
    await handle.flushToggle();
    expect(handle.details()?.hasAttribute("open")).toBe(true);
    expect(seen).toEqual([true]);
    handle.unmount();
  });

  test("controlled: parent-driven close while open fires no callback", async () => {
    const seen: boolean[] = [];
    const props = (open: boolean): ComponentProps<typeof ReasoningBlock> => ({
      text: "Controlled.",
      open,
      onOpenChange: (next) => seen.push(next),
    });
    const handle = mount(props(true));
    await handle.flushToggle();
    expect(seen).toEqual([]);

    handle.rerender(props(false));
    await handle.flushToggle();
    expect(handle.details()?.hasAttribute("open")).toBe(false);
    expect(seen).toEqual([]);
    handle.unmount();
  });
});
