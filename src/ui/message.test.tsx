import { act, createRef } from "react";
import type { ReactElement } from "react";
import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, mock, test } from "bun:test";

import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
  MessageHeader,
  MessageSendStatus,
} from "./message.js";
import {
  MessageAction,
  MessageActionMenu,
  MessageActions,
} from "./message-actions.js";
import { MessageReactions } from "./message-reactions.js";
import { MessageReplies } from "./message-replies.js";

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

function slot(container: HTMLElement, name: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(`[data-slot='${name}']`);
  if (element === null) throw new Error(`expected a ${name}`);
  return element;
}

function button(container: HTMLElement, name: string): HTMLButtonElement {
  const match = [...container.querySelectorAll("button")].find(
    (element) =>
      (element.getAttribute("aria-label") ?? element.textContent?.trim()) ===
      name,
  );
  if (match === undefined) throw new Error(`expected a ${name} button`);
  return match;
}

/** Message's own status region. */
function region(container: HTMLElement): Element | null {
  return container.querySelector("[data-slot='message'] > [role='status']");
}

/** The visible error on a failed message's status line. */
function visibleReason(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>(
    "[data-slot='message-send-status'] > span",
  );
}

const NOW = Date.parse("2026-03-04T12:00:00.000Z");

describe("Message", () => {
  test("marks its root with who it is from and its status", () => {
    const mounted = render(
      <Message from="agent" status="streaming">
        <MessageContent text="Hi" />
      </Message>,
    );
    const root = slot(mounted.container, "message");
    expect(root.tagName).toBe("ARTICLE");
    expect(root.dataset["from"]).toBe("agent");
    expect(root.dataset["status"]).toBe("streaming");
    expect(
      slot(mounted.container, "message-content").getAttribute("aria-busy"),
    ).toBe("true");
    mounted.unmount();
  });

  test("forwards a ref to the article", () => {
    const ref = createRef<HTMLElement>();
    const mounted = render(<Message from="person" ref={ref} />);
    expect(ref.current).toBe(slot(mounted.container, "message"));
    mounted.unmount();
  });

  test("a sending message says it is on its way", () => {
    const mounted = render(
      <Message from="own" status="sending">
        <MessageContent text="On its way" />
        <MessageSendStatus />
      </Message>,
    );
    expect(slot(mounted.container, "message-send-status").textContent).toBe(
      "Sending…",
    );
    expect(mounted.container.querySelector("button")).toBeNull();
    mounted.unmount();
  });

  test("a sent message shows no status", () => {
    const mounted = render(
      <Message from="own">
        <MessageContent text="Done" />
        <MessageSendStatus />
      </Message>,
    );
    expect(
      mounted.container.querySelector("[data-slot='message-send-status']"),
    ).toBeNull();
    mounted.unmount();
  });

  test("a failed message shows its error and a retry that calls onRetry once", () => {
    const onRetry = mock(() => {});
    const mounted = render(
      <Message
        from="own"
        status="failed"
        error="Couldn't send. Check your connection."
        onRetry={onRetry}
      >
        <MessageContent text="Hello" />
        <MessageSendStatus />
      </Message>,
    );
    const status = slot(mounted.container, "message-send-status");
    expect(status.textContent).toContain(
      "Couldn't send. Check your connection.",
    );
    act(() => button(mounted.container, "Retry").click());
    expect(onRetry).toHaveBeenCalledTimes(1);
    mounted.unmount();
  });

  test("a failed message without onRetry offers no retry", () => {
    const mounted = render(
      <Message from="own" status="failed">
        <MessageSendStatus />
      </Message>,
    );
    expect(
      slot(mounted.container, "message-send-status").textContent,
    ).toContain("Not sent.");
    expect(mounted.container.querySelector("button")).toBeNull();
    mounted.unmount();
  });

  test("a failed message shows its error and retry without a placed MessageSendStatus", () => {
    const onRetry = mock(() => {});
    const mounted = render(
      <Message
        from="own"
        status="failed"
        error="Couldn't send"
        onRetry={onRetry}
      >
        <MessageContent text="Hello" />
      </Message>,
    );
    const status = slot(mounted.container, "message-send-status");
    expect(status.textContent).toContain("Couldn't send");
    act(() => button(mounted.container, "Retry").click());
    expect(onRetry).toHaveBeenCalledTimes(1);
    mounted.unmount();
  });

  test("a sending message says so without a placed MessageSendStatus", () => {
    const mounted = render(
      <Message from="own" status="sending">
        <MessageContent text="On its way" />
      </Message>,
    );
    expect(slot(mounted.container, "message-send-status").textContent).toBe(
      "Sending…",
    );
    mounted.unmount();
  });

  test("a placed MessageSendStatus is the only one, where the host put it", () => {
    const mounted = render(
      <Message from="own" status="failed">
        <>
          <MessageSendStatus />
        </>
        <MessageContent text="Hello" />
      </Message>,
    );
    const lines = mounted.container.querySelectorAll(
      "[data-slot='message-send-status']",
    );
    expect(lines).toHaveLength(1);
    expect(slot(mounted.container, "message").firstElementChild).toBe(
      lines[0] ?? null,
    );
    mounted.unmount();
  });

  test("a failure after mount is announced once; one mounted failed is not", () => {
    const at = (status: "sending" | "failed") => (
      <Message from="own" status={status} error="Couldn't send">
        <MessageContent text="Hello" />
      </Message>
    );

    const history = render(at("failed"));
    expect(region(history.container)?.textContent).toBe("");
    expect(visibleReason(history.container)?.hasAttribute("aria-hidden")).toBe(
      false,
    );
    history.unmount();

    const live = render(at("sending"));
    expect(region(live.container)?.textContent).toBe("");
    live.rerender(at("failed"));
    expect(region(live.container)?.textContent).toBe("Couldn't send");
    // The region holds exactly the visible text, which is then hidden.
    expect(visibleReason(live.container)?.getAttribute("aria-hidden")).toBe(
      "true",
    );
    live.unmount();
  });

  test("an error that arrives after the failure is what is announced", () => {
    const at = (status: "sending" | "failed", error?: string) => (
      <Message from="own" status={status} error={error}>
        <MessageContent text="Hello" />
      </Message>
    );
    const mounted = render(at("sending"));
    mounted.rerender(at("failed"));
    expect(region(mounted.container)?.textContent).toBe("Not sent.");
    mounted.rerender(at("failed", "Network down"));
    expect(region(mounted.container)?.textContent).toBe("Network down");
    expect(visibleReason(mounted.container)?.textContent).toBe("Network down");
    expect(mounted.container.textContent).not.toContain("Not sent: ");
    mounted.unmount();
  });

  test("a line placed in the footer replaces the added one and is announced once", () => {
    const onRetry = mock(() => {});
    const at = (status: "sending" | "failed") => (
      <Message
        from="own"
        status={status}
        error="Couldn't send"
        onRetry={onRetry}
      >
        <MessageContent text="Hello" />
        <MessageFooter>
          <MessageSendStatus />
        </MessageFooter>
      </Message>
    );
    const mounted = render(at("sending"));
    mounted.rerender(at("failed"));
    const lines = mounted.container.querySelectorAll(
      "[data-slot='message-send-status']",
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]?.parentElement?.dataset["slot"]).toBe("message-footer");
    const retries = [...mounted.container.querySelectorAll("button")].filter(
      (element) => element.textContent === "Retry",
    );
    expect(retries).toHaveLength(1);
    const regions = [...mounted.container.querySelectorAll("[role='status']")];
    expect(regions.map((element) => element.textContent)).toEqual([
      "Couldn't send",
    ]);
    mounted.unmount();
  });

  test("a line the host mounts only once failed still announces a failure it saw", () => {
    const at = (status: "sending" | "failed") => (
      <Message from="own" status={status} error="Couldn't send">
        <MessageContent text="Hello" />
        {status === "failed" ? <MessageSendStatus /> : null}
      </Message>
    );
    const mounted = render(at("sending"));
    mounted.rerender(at("failed"));
    expect(
      mounted.container.querySelectorAll("[data-slot='message-send-status']"),
    ).toHaveLength(1);
    expect(region(mounted.container)?.textContent).toBe("Couldn't send");
    mounted.unmount();
  });

  test("a nested placed line never paints beside the added one", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    // flushSync returns after the commit and its layout effects, before the
    // browser could paint: what is in the DOM now is the first frame.
    flushSync(() =>
      root.render(
        <Message from="own" status="failed">
          <MessageContent text="Hello" />
          <MessageFooter>
            <MessageSendStatus />
          </MessageFooter>
        </Message>,
      ),
    );
    expect(
      container.querySelectorAll("[data-slot='message-send-status']"),
    ).toHaveLength(1);
    act(() => root.unmount());
    container.remove();
  });

  test("inside a log a failure is left to the log to announce", () => {
    const at = (status: "sending" | "failed") => (
      <div role="log">
        <Message from="own" status={status} error="Couldn't send">
          <MessageContent text="Hello" />
        </Message>
      </div>
    );
    const mounted = render(at("sending"));
    mounted.rerender(at("failed"));
    expect(region(mounted.container)?.textContent).toBe("");
    expect(
      slot(mounted.container, "message-send-status").textContent,
    ).toContain("Couldn't send");
    expect(visibleReason(mounted.container)?.hasAttribute("aria-hidden")).toBe(
      false,
    );
    mounted.unmount();
  });

  test("is named by its header's author name", () => {
    const mounted = render(
      <Message from="agent">
        <MessageHeader name="Ada" role="Assistant" />
        <MessageContent text="Hi" />
      </Message>,
    );
    const root = slot(mounted.container, "message");
    const id = root.getAttribute("aria-labelledby") ?? "";
    expect(id).not.toBe("");
    expect(mounted.container.querySelector(`[id='${id}']`)?.textContent).toBe(
      "Ada",
    );
    mounted.unmount();
  });

  test("a header nested in a wrapper still names it", () => {
    function Top() {
      return (
        <div>
          <MessageHeader name="Ada" />
        </div>
      );
    }
    const mounted = render(
      <Message from="agent">
        <Top />
        <MessageContent text="Hi" />
      </Message>,
    );
    const id =
      slot(mounted.container, "message").getAttribute("aria-labelledby") ?? "";
    expect(id).not.toBe("");
    expect(mounted.container.querySelector(`[id='${id}']`)?.textContent).toBe(
      "Ada",
    );
    mounted.unmount();
  });

  test("without a header, or with the host's own label, the host's label names it", () => {
    const bare = render(
      <Message from="own" aria-label="You">
        <MessageContent text="Hi" />
      </Message>,
    );
    const labelled = render(
      <Message from="agent" aria-label="Ada, 5 min ago">
        <MessageHeader name="Ada" />
      </Message>,
    );
    for (const mounted of [bare, labelled]) {
      const root = slot(mounted.container, "message");
      expect(root.hasAttribute("aria-labelledby")).toBe(false);
    }
    expect(slot(bare.container, "message").getAttribute("aria-label")).toBe(
      "You",
    );
    expect(slot(labelled.container, "message").getAttribute("aria-label")).toBe(
      "Ada, 5 min ago",
    );
    bare.unmount();
    labelled.unmount();
  });

  test("declares a row only for parts that take one", () => {
    const rows = (node: ReactElement) => {
      const mounted = render(node);
      const value = slot(mounted.container, "message").style.gridTemplateRows;
      mounted.unmount();
      return value;
    };
    expect(
      rows(
        <Message from="agent">
          <MessageAvatar name="Ada" />
          <MessageHeader name="Ada" />
          <MessageContent text="Hi" />
          <MessageSendStatus />
        </Message>,
      ),
    ).toBe("repeat(2, auto)");
    expect(
      rows(
        <Message from="own" status="failed">
          <MessageContent text="Hi" />
        </Message>,
      ),
    ).toBe("repeat(2, auto)");
  });

  test("MessageContent passes its text through render", () => {
    const renderText = mock((text: string) => (
      <strong>{text.toUpperCase()}</strong>
    ));
    const mounted = render(
      <Message from="agent">
        <MessageContent text="**bold**" render={renderText} />
      </Message>,
    );
    expect(renderText).toHaveBeenCalledWith("**bold**");
    const content = slot(mounted.container, "message-content");
    expect(content.querySelector("strong")?.textContent).toBe("**BOLD**");
    mounted.unmount();
  });

  test("MessageContent shows plain text without render, children without text", () => {
    const mounted = render(
      <Message from="agent">
        <MessageContent text="<b>not html</b>" />
        <MessageContent>
          <em>custom</em>
        </MessageContent>
      </Message>,
    );
    const [plain, custom] = mounted.container.querySelectorAll(
      "[data-slot='message-content']",
    );
    expect(plain?.textContent).toBe("<b>not html</b>");
    expect(plain?.querySelector("b")).toBeNull();
    expect(custom?.querySelector("em")?.textContent).toBe("custom");
    mounted.unmount();
  });

  test("only own messages put their content in a bubble", () => {
    const own = render(
      <Message from="own">
        <MessageContent text="Mine" />
      </Message>,
    );
    const agent = render(
      <Message from="agent">
        <MessageContent text="Theirs" />
      </Message>,
    );
    expect(slot(own.container, "message-content").className).toContain(
      "bg-muted",
    );
    expect(slot(agent.container, "message-content").className).not.toContain(
      "bg-muted",
    );
    own.unmount();
    agent.unmount();
  });

  test("the avatar is labelled with the author and toned by who it is from", () => {
    const mounted = render(
      <Message from="agent">
        <MessageAvatar name="Ada Lovelace" />
      </Message>,
    );
    const avatar = mounted.container.querySelector("[role='img']");
    expect(avatar?.getAttribute("aria-label")).toBe("Ada Lovelace");
    expect(avatar?.textContent).toBe("AL");
    expect(avatar?.className).toContain("bg-primary");
    mounted.unmount();
  });

  test("the header shows the name, role and a relative time", () => {
    const mounted = render(
      <Message from="agent">
        <MessageHeader
          name="Ada"
          role="Assistant"
          at="2026-03-04T11:55:00.000Z"
          now={NOW}
        />
      </Message>,
    );
    const header = slot(mounted.container, "message-header");
    expect(header.textContent).toContain("Ada");
    expect(header.textContent).toContain("Assistant");
    const time = header.querySelector("time");
    expect(time?.getAttribute("dateTime")).toBe("2026-03-04T11:55:00.000Z");
    expect(time?.textContent).toContain("5");
    mounted.unmount();
  });

  test("parts throw outside a Message", () => {
    const original = console.error;
    console.error = () => {};
    try {
      expect(() => render(<MessageFooter />)).toThrow(
        "MessageFooter must be inside a Message.",
      );
    } finally {
      console.error = original;
    }
  });
});

describe("MessageActions", () => {
  test("an action is an icon button named by its label", () => {
    const onClick = mock(() => {});
    const mounted = render(
      <MessageActions>
        <MessageAction label="Copy" onClick={onClick} />
        <MessageAction label="Good response" aria-pressed />
      </MessageActions>,
    );
    const group = slot(mounted.container, "message-actions");
    expect(group.getAttribute("role")).toBe("group");
    expect(group.getAttribute("aria-label")).toBe("Message actions");
    act(() => button(mounted.container, "Copy").click());
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(
      button(mounted.container, "Good response").getAttribute("aria-pressed"),
    ).toBe("true");
    mounted.unmount();
  });

  test("the overflow menu mounts its items only while open", () => {
    const onPin = mock(() => {});
    const mounted = render(
      <MessageActions>
        <MessageActionMenu>
          <MessageAction label="Pin" onClick={onPin} />
          <MessageAction label="Mark useful" aria-pressed={false} />
        </MessageActionMenu>
      </MessageActions>,
    );
    const trigger = button(mounted.container, "More actions");
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(mounted.container.querySelector("[role='menu']")).toBeNull();

    act(() => trigger.click());
    const menu = mounted.container.querySelector("[role='menu']");
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(trigger.getAttribute("aria-controls")).toBe(menu?.id ?? "");
    const pin = menu?.querySelector("[role='menuitem']");
    expect(pin?.textContent).toBe("Pin");
    expect(document.activeElement).toBe(pin ?? null);
    const toggle = menu?.querySelector("[role='menuitemcheckbox']");
    expect(toggle?.getAttribute("aria-checked")).toBe("false");

    act(() => (pin as HTMLButtonElement).click());
    expect(onPin).toHaveBeenCalledTimes(1);
    expect(mounted.container.querySelector("[role='menu']")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    mounted.unmount();
  });
});

describe("MessageActionMenu", () => {
  const menu = () => (
    <MessageActionMenu>
      <MessageAction label="Pin" />
      <MessageAction label="Share" />
    </MessageActionMenu>
  );

  test("pressing the trigger closes an open menu when the click does not focus it", () => {
    const mounted = render(menu());
    const trigger = button(mounted.container, "More actions");
    act(() => trigger.click());
    const item =
      mounted.container.querySelector<HTMLElement>("[role='menuitem']");
    expect(document.activeElement).toBe(item);
    // Safari: the press blurs the item with no relatedTarget and leaves the
    // trigger unfocused, then the click lands.
    act(() => {
      trigger.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      item?.blur();
    });
    act(() => trigger.click());
    expect(mounted.container.querySelector("[role='menu']")).toBeNull();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(document.activeElement).toBe(trigger);
    mounted.unmount();
  });

  test("Shift+Tab from an item closes it and returns to the trigger", () => {
    const mounted = render(menu());
    const trigger = button(mounted.container, "More actions");
    act(() => trigger.click());
    const item =
      mounted.container.querySelector<HTMLElement>("[role='menuitem']");
    act(() => {
      item?.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: "Tab",
          shiftKey: true,
          bubbles: true,
        }),
      );
    });
    expect(mounted.container.querySelector("[role='menu']")).toBeNull();
    expect(document.activeElement).toBe(trigger);
    mounted.unmount();
  });

  test("a click outside closes it when the host passes a ref", () => {
    const ref = createRef<HTMLDivElement>();
    const mounted = render(
      <MessageActionMenu ref={ref}>
        <MessageAction label="Pin" />
      </MessageActionMenu>,
    );
    expect<HTMLElement | null>(ref.current).toBe(
      slot(mounted.container, "message-action-menu"),
    );
    act(() => button(mounted.container, "More actions").click());
    expect(mounted.container.querySelector("[role='menu']")).not.toBeNull();
    act(() => {
      document.body.dispatchEvent(
        new PointerEvent("pointerdown", { bubbles: true }),
      );
    });
    expect(mounted.container.querySelector("[role='menu']")).toBeNull();
    mounted.unmount();
  });

  test("it flips above a trigger near the bottom when the host passes a ref", () => {
    const realRect = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      const height = window.innerHeight;
      if (this.dataset["slot"] === "message-action-menu") {
        return { top: height - 40, bottom: height - 12, height: 28 } as DOMRect;
      }
      if (this.dataset["slot"] === "message-action-menu-content") {
        return { top: 0, bottom: 200, height: 200 } as DOMRect;
      }
      return realRect.call(this);
    };
    try {
      const mounted = render(
        <MessageActionMenu ref={createRef<HTMLDivElement>()}>
          <MessageAction label="Pin" />
        </MessageActionMenu>,
      );
      act(() => button(mounted.container, "More actions").click());
      expect(
        mounted.container
          .querySelector("[role='menu']")
          ?.getAttribute("data-side"),
      ).toBe("top");
      mounted.unmount();
    } finally {
      HTMLElement.prototype.getBoundingClientRect = realRect;
    }
  });
});

describe("MessageReactions", () => {
  const reactions = [
    { emoji: "🎉", count: 2, mine: true },
    { emoji: "👀", count: 1, mine: false },
  ];

  test("each reaction toggles through onReact and says whether it is yours", () => {
    const onReact = mock((_emoji: string) => {});
    const mounted = render(
      <MessageReactions reactions={reactions} onReact={onReact} />,
    );
    const buttons = mounted.container.querySelectorAll("button");
    expect(buttons[0]?.getAttribute("aria-pressed")).toBe("true");
    expect(buttons[0]?.getAttribute("aria-label")).toBe(
      "🎉, 2 reactions, including yours",
    );
    expect(buttons[1]?.getAttribute("aria-pressed")).toBe("false");
    act(() => buttons[1]?.click());
    expect(onReact).toHaveBeenCalledWith("👀");
    mounted.unmount();
  });

  test("without onReact the reactions are shown, not offered", () => {
    const mounted = render(<MessageReactions reactions={reactions} />);
    expect(mounted.container.querySelector("button")).toBeNull();
    expect(
      mounted.container.querySelectorAll("[data-slot='message-reaction']"),
    ).toHaveLength(2);
    mounted.unmount();
  });

  test("renders nothing with no reactions", () => {
    const mounted = render(<MessageReactions reactions={[]} />);
    expect(mounted.container.innerHTML).toBe("");
    mounted.unmount();
  });
});

describe("MessageReplies", () => {
  test("shows the count and when the last reply came", () => {
    const onClick = mock(() => {});
    const mounted = render(
      <MessageReplies
        replies={{ count: 2, lastAt: "2026-03-04T11:50:00.000Z" }}
        now={NOW}
        onClick={onClick}
      />,
    );
    const replies = slot(mounted.container, "message-replies");
    expect(replies.textContent).toContain("2 replies");
    expect(replies.textContent).toContain("Last reply");
    expect(replies.querySelector("time")?.textContent).toContain("10");
    act(() => replies.click());
    expect(onClick).toHaveBeenCalledTimes(1);
    mounted.unmount();
  });

  test("renders nothing with no replies", () => {
    const mounted = render(
      <MessageReplies replies={{ count: 0, lastAt: "2026-03-04T11:50:00Z" }} />,
    );
    expect(mounted.container.innerHTML).toBe("");
    mounted.unmount();
  });
});
