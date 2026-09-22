import { describe, expect, mock, test } from "bun:test";
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

import { ChatInput, type ChatInputProps } from "./chat-input.js";

function mount(overrides: Partial<ChatInputProps> = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  const props: ChatInputProps = {
    value: "",
    onValueChange: mock(),
    onSend: mock(),
    ...overrides,
  };
  act(() => {
    root.render(createElement(ChatInput, props));
  });
  return {
    container,
    attach: () => container.querySelector('button[aria-label="Attach files"]') as HTMLButtonElement | null,
    send: () => container.querySelector('button[aria-label="Send message"]') as HTMLButtonElement | null,
    stop: () => container.querySelector('button[aria-label="Stop generating"]') as HTMLButtonElement | null,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("ChatInput icon slots", () => {
  test("send defaults to the ArrowUp lucide icon", () => {
    const { send, unmount } = mount();
    const svg = send()?.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.classList.contains("size-4")).toBe(true);
    expect(svg?.getAttribute("class") ?? "").toMatch(/lucide-arrow-up|lucide-arrowup/i);
    unmount();
  });

  test("sendIcon replaces the default send glyph", () => {
    const sendIcon: ReactNode = createElement("span", { "data-slot": "custom-send" }, "go");
    const { send, unmount } = mount({ sendIcon });
    expect(send()?.querySelector('[data-slot="custom-send"]')?.textContent).toBe("go");
    expect(send()?.querySelector("svg")).toBeNull();
    unmount();
  });

  test("attach defaults to the Paperclip lucide icon when onAttach is set", () => {
    const { attach, unmount } = mount({ onAttach: mock() });
    const svg = attach()?.querySelector("svg");
    expect(attach()).not.toBeNull();
    expect(svg).not.toBeNull();
    expect(svg?.classList.contains("size-4")).toBe(true);
    expect(svg?.getAttribute("class") ?? "").toMatch(/lucide-paperclip/i);
    unmount();
  });

  test("attachIcon replaces the default attach glyph", () => {
    const attachIcon: ReactNode = createElement("span", { "data-slot": "custom-attach" }, "clip");
    const { attach, unmount } = mount({ onAttach: mock(), attachIcon });
    expect(attach()?.querySelector('[data-slot="custom-attach"]')?.textContent).toBe("clip");
    expect(attach()?.querySelector("svg")).toBeNull();
    unmount();
  });

  test("sendIcon does not replace the stop control", () => {
    const sendIcon: ReactNode = createElement("span", { "data-slot": "custom-send" }, "go");
    const { send, stop, unmount } = mount({
      working: true,
      onStop: mock(),
      sendIcon,
    });
    expect(send()).toBeNull();
    expect(stop()).not.toBeNull();
    expect(stop()?.querySelector('[data-slot="custom-send"]')).toBeNull();
    expect(stop()?.querySelector("svg")?.classList.contains("size-3.5")).toBe(true);
    unmount();
  });
});
