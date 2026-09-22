import { describe, expect, mock, test } from "bun:test";
import { act, createElement, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

import {
  ChatInput,
  ChatInputAttach,
  ChatInputBody,
  ChatInputButton,
  ChatInputFooter,
  ChatInputHeader,
  ChatInputRoot,
  ChatInputSubmit,
  ChatInputTextarea,
  ChatInputTools,
  type ChatInputProps,
} from "./chat-input.js";

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
    textarea: () => container.querySelector("textarea") as HTMLTextAreaElement,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function mountTree(node: ReactNode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(node);
  });
  return {
    container,
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

describe("ChatInput tool slots", () => {
  test("leadingTools appears in the footer tools row", () => {
    const leadingTools = createElement(
      "button",
      { type: "button", "data-slot": "dictate" },
      "mic",
    );
    const { container, unmount } = mount({ onAttach: mock(), leadingTools });
    const tools = container.querySelector('[data-slot="chat-input-tools"]');
    expect(tools?.querySelector('[data-slot="dictate"]')?.textContent).toBe("mic");
    expect(tools?.querySelector('button[aria-label="Attach files"]')).not.toBeNull();
    unmount();
  });

  test("trailingTools appears before send", () => {
    const trailingTools = createElement("span", { "data-slot": "model-picker" }, "gpt");
    const { container, send, unmount } = mount({ trailingTools });
    const footer = container.querySelector('[data-slot="chat-input-footer"]');
    const picker = footer?.querySelector('[data-slot="model-picker"]');
    const sendButton = send();
    expect(picker?.textContent).toBe("gpt");
    expect(picker).not.toBeNull();
    expect(sendButton).not.toBeNull();
    if (picker !== null && picker !== undefined && sendButton !== null) {
      expect(picker.compareDocumentPosition(sendButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    unmount();
  });
});

describe("ChatInput send", () => {
  test("Enter still sends", () => {
    const onSend = mock();
    const { textarea, unmount } = mount({ value: "hello", onSend });
    act(() => {
      textarea().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    });
    expect(onSend).toHaveBeenCalledTimes(1);
    unmount();
  });

  test("Shift+Enter does not send", () => {
    const onSend = mock();
    const { textarea, unmount } = mount({ value: "hello", onSend });
    act(() => {
      textarea().dispatchEvent(
        new KeyboardEvent("keydown", { key: "Enter", shiftKey: true, bubbles: true, cancelable: true }),
      );
    });
    expect(onSend).not.toHaveBeenCalled();
    unmount();
  });

  test("empty value does not send on Enter", () => {
    const onSend = mock();
    const { textarea, unmount } = mount({ value: "   ", onSend });
    act(() => {
      textarea().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    });
    expect(onSend).not.toHaveBeenCalled();
    unmount();
  });
});

describe("ChatInput compound slots", () => {
  test("compound footer renders a custom tool beside attach and send", () => {
    const onAttach = mock();
    const { container, unmount } = mountTree(
      <ChatInputRoot>
        <ChatInputHeader>
          <span data-slot="extra-header">files</span>
        </ChatInputHeader>
        <ChatInputBody>
          <ChatInputTextarea />
        </ChatInputBody>
        <ChatInputFooter>
          <ChatInputTools>
            <ChatInputButton aria-label="Dictate">mic</ChatInputButton>
            <ChatInputAttach onAttach={onAttach} />
          </ChatInputTools>
          <ChatInputSubmit />
        </ChatInputFooter>
      </ChatInputRoot>,
    );
    expect(container.querySelector('[data-slot="chat-input-footer"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="extra-header"]')?.textContent).toBe("files");
    expect(container.querySelector('[aria-label="Dictate"]')?.textContent).toBe("mic");
    expect(container.querySelector('[aria-label="Attach files"]')).not.toBeNull();
    expect(container.querySelector('[aria-label="Send message"]')).not.toBeNull();
    unmount();
  });
});
