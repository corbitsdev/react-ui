import { act, createRef } from "react";
import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import type {
  ConversationMessage,
  ConversationParticipant,
} from "../lib/conversation.js";
import { ConversationThread } from "./conversation-thread.js";

type Mounted = {
  container: HTMLElement;
  rerender: (node: ReactElement) => void;
  unmount: () => void;
};

function render(node: ReactElement): Mounted {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root!: Root;
  act(() => {
    root = createRoot(container);
    root.render(node);
  });
  return {
    container,
    rerender: (next) => act(() => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

const agent: ConversationParticipant = {
  id: "agent",
  kind: "agent",
  name: "Agent",
};

function message(id: string, text: string): ConversationMessage {
  return {
    id,
    author: agent,
    at: "2026-03-04T12:00:00.000Z",
    status: "sent",
    parts: [{ kind: "text", text }],
  };
}

const parent = message("parent", "The parent");
const replies = [message("r1", "First reply"), message("r2", "Second reply")];

const renderMessage = (item: ConversationMessage) => (
  <p data-testid={item.id}>
    {item.parts.map((part) => (part.kind === "text" ? part.text : null))}
  </p>
);

function items(container: HTMLElement): string[] {
  return [
    ...container.querySelectorAll<HTMLElement>(
      "[data-slot='conversation-item']",
    ),
  ].map((element) => element.dataset.itemId ?? "");
}

describe("ConversationThread", () => {
  test("heads the thread with its parent, then a count, then the replies in order", () => {
    const mounted = render(
      <ConversationThread
        parent={parent}
        replies={replies}
        renderMessage={renderMessage}
      />,
    );
    const log = mounted.container.querySelector("[role='log']");
    expect(log?.getAttribute("aria-label")).toBe("Thread");
    expect(items(mounted.container)).toEqual(["parent", "r1", "r2"]);
    const column = mounted.container.querySelector(
      "[data-slot='conversation-column']",
    );
    const order = [...(column?.children ?? [])].map(
      (child) => child.getAttribute("data-slot") ?? "",
    );
    expect(order).toEqual([
      "conversation-item",
      "conversation-divider",
      "conversation-item",
      "conversation-item",
    ]);
    expect(
      mounted.container.querySelector("[data-slot='conversation-divider']")
        ?.textContent,
    ).toBe("2 replies");
    expect(
      mounted.container.querySelector("[data-testid='parent']")?.textContent,
    ).toBe("The parent");
    mounted.unmount();
  });

  test("counts one reply, and says when there are none yet", () => {
    const divider = (mounted: Mounted) =>
      mounted.container.querySelector("[data-slot='conversation-divider']")
        ?.textContent;
    const mounted = render(
      <ConversationThread
        parent={parent}
        replies={[]}
        renderMessage={renderMessage}
      />,
    );
    expect(divider(mounted)).toBe("No replies yet");
    expect(items(mounted.container)).toEqual(["parent"]);
    mounted.rerender(
      <ConversationThread
        parent={parent}
        replies={replies.slice(0, 1)}
        renderMessage={renderMessage}
      />,
    );
    expect(divider(mounted)).toBe("1 reply");
    expect(items(mounted.container)).toEqual(["parent", "r1"]);
    mounted.unmount();
  });

  test("puts the input under the conversation, outside the log", () => {
    const mounted = render(
      <ConversationThread
        parent={parent}
        replies={replies}
        renderMessage={renderMessage}
        labels={{ log: "Thread: the parent" }}
      >
        <textarea aria-label="Reply" />
      </ConversationThread>,
    );
    const root = mounted.container.querySelector<HTMLElement>(
      "[data-slot='conversation-thread']",
    );
    const input = mounted.container.querySelector(
      "[data-slot='conversation-thread-input']",
    );
    expect(input?.parentElement).toBe(root);
    expect(input?.previousElementSibling?.getAttribute("data-slot")).toBe(
      "conversation",
    );
    expect(input?.querySelector("textarea")).not.toBeNull();
    expect(input?.closest("[role='log']")).toBeNull();
    expect(
      mounted.container
        .querySelector("[role='log']")
        ?.getAttribute("aria-label"),
    ).toBe("Thread: the parent");
    mounted.unmount();
  });

  test("leaves out the input slot without children", () => {
    const mounted = render(
      <ConversationThread
        parent={parent}
        replies={replies}
        renderMessage={renderMessage}
      />,
    );
    expect(
      mounted.container.querySelector(
        "[data-slot='conversation-thread-input']",
      ),
    ).toBeNull();
    mounted.unmount();
  });

  test("leaves out the input slot for boolean children", () => {
    for (const show of [false, true]) {
      const mounted = render(
        <ConversationThread
          parent={parent}
          replies={replies}
          renderMessage={renderMessage}
        >
          {show}
        </ConversationThread>,
      );
      expect(
        mounted.container.querySelector(
          "[data-slot='conversation-thread-input']",
        ),
      ).toBeNull();
      mounted.unmount();
    }
  });

  test("gives the root its ref, props and classes, and the policy to the conversation", () => {
    const ref = createRef<HTMLDivElement>();
    const mounted = render(
      <ConversationThread
        ref={ref}
        id="thread-root"
        className="bg-background"
        parent={parent}
        replies={replies}
        renderMessage={renderMessage}
        scrollPolicy="stick"
      />,
    );
    expect(ref.current?.dataset.slot).toBe("conversation-thread");
    expect(ref.current?.id).toBe("thread-root");
    expect(ref.current?.className).toContain("bg-background");
    expect(ref.current?.className).toContain("flex-col");
    expect(
      mounted.container
        .querySelector("[data-slot='conversation']")
        ?.getAttribute("data-scroll-policy"),
    ).toBe("stick");
    mounted.unmount();
  });

  test("names the log by aria-labelledby, and takes its own labels", () => {
    const mounted = render(
      <>
        <span id="thread-tab">Weekly report</span>
        <ConversationThread
          aria-labelledby="thread-tab"
          parent={parent}
          replies={replies}
          renderMessage={renderMessage}
          labels={{ replies: (count) => `${count} answers` }}
        />
      </>,
    );
    const log = mounted.container.querySelector("[role='log']");
    expect(log?.getAttribute("aria-labelledby")).toBe("thread-tab");
    expect(log?.hasAttribute("aria-label")).toBe(false);
    expect(
      mounted.container
        .querySelector("[data-slot='conversation-thread']")
        ?.hasAttribute("aria-labelledby"),
    ).toBe(false);
    expect(
      mounted.container.querySelector("[data-thread-divider]")?.textContent,
    ).toBe("2 answers");
    mounted.unmount();
  });

  test("an aria-label names the log, not the root", () => {
    const mounted = render(
      <ConversationThread
        aria-label="Replies to the weekly report"
        parent={parent}
        replies={replies}
        renderMessage={renderMessage}
      />,
    );
    const log = mounted.container.querySelector("[role='log']");
    expect(log?.getAttribute("aria-label")).toBe(
      "Replies to the weekly report",
    );
    expect(
      mounted.container
        .querySelector("[data-slot='conversation-thread']")
        ?.hasAttribute("aria-label"),
    ).toBe(false);
    mounted.unmount();
  });
});
