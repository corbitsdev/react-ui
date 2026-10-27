import { act, useState } from "react";
import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, mock, test } from "bun:test";

import { Message, MessageContent } from "./message.js";
import { MessageFold } from "./message-fold.js";

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

function toggle(container: HTMLElement): HTMLButtonElement | null {
  return container.querySelector<HTMLButtonElement>(
    "[data-slot='message-fold-toggle']",
  );
}

function state(container: HTMLElement): string | undefined {
  return container.querySelector<HTMLElement>("[data-slot='message-fold']")
    ?.dataset["state"];
}

describe("MessageFold", () => {
  test("under the threshold renders its children and no toggle", () => {
    const mounted = render(
      <MessageFold length={100} threshold={200}>
        <p>Short answer</p>
      </MessageFold>,
    );
    expect(mounted.container.textContent).toBe("Short answer");
    expect(toggle(mounted.container)).toBeNull();
    expect(state(mounted.container)).toBeUndefined();
    mounted.unmount();
  });

  test("over the threshold folds by default and toggles", () => {
    const onOpenChange = mock((_open: boolean) => {});
    const mounted = render(
      <MessageFold length={300} threshold={200} onOpenChange={onOpenChange}>
        <p>Long answer</p>
      </MessageFold>,
    );
    const button = toggle(mounted.container);
    expect(state(mounted.container)).toBe("folded");
    expect(button?.getAttribute("aria-expanded")).toBe("false");
    expect(button?.textContent).toContain("Show full answer");
    const body = mounted.container.querySelector(
      "[data-slot='message-fold-body']",
    );
    expect(button?.getAttribute("aria-controls")).toBe(body?.id ?? "");

    act(() => button?.click());
    expect(state(mounted.container)).toBe("open");
    expect(button?.getAttribute("aria-expanded")).toBe("true");
    expect(button?.textContent).toContain("Show less");
    expect(onOpenChange).toHaveBeenLastCalledWith(true);

    act(() => button?.click());
    expect(state(mounted.container)).toBe("folded");
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    mounted.unmount();
  });

  test("the default threshold is about a thousand words", () => {
    const short = render(
      <MessageFold length={6_000}>
        <p>At the limit</p>
      </MessageFold>,
    );
    const long = render(
      <MessageFold length={6_001}>
        <p>Past it</p>
      </MessageFold>,
    );
    expect(toggle(short.container)).toBeNull();
    expect(toggle(long.container)).not.toBeNull();
    short.unmount();
    long.unmount();
  });

  test("streaming content never folds", () => {
    const mounted = render(
      <MessageFold length={10_000} streaming>
        <p>Still arriving</p>
      </MessageFold>,
    );
    expect(toggle(mounted.container)).toBeNull();
    mounted.unmount();
  });

  test("reads streaming from the enclosing Message", () => {
    const mounted = render(
      <Message from="agent" status="streaming">
        <MessageFold length={10_000}>
          <MessageContent text="Still arriving" />
        </MessageFold>
      </Message>,
    );
    expect(toggle(mounted.container)).toBeNull();
    mounted.unmount();
  });

  test("an answer that finished streaming in view stays open", () => {
    const at = (status: "streaming" | "sent") => (
      <Message from="agent" status={status}>
        <MessageFold length={10_000}>
          <MessageContent text="Long answer" />
        </MessageFold>
      </Message>
    );
    const mounted = render(at("streaming"));
    mounted.rerender(at("sent"));
    expect(state(mounted.container)).toBe("open");
    mounted.unmount();
  });

  test("honours a controlled open flag", () => {
    const mounted = render(
      <MessageFold length={300} threshold={200} open>
        <p>Long answer</p>
      </MessageFold>,
    );
    expect(state(mounted.container)).toBe("open");
    act(() => toggle(mounted.container)?.click());
    expect(state(mounted.container)).toBe("open");
    mounted.unmount();
  });

  test("a close the controlled host ignored does not move the page later", async () => {
    const page = document.scrollingElement as HTMLElement;
    const at = (open: boolean) => (
      <MessageFold
        length={300}
        threshold={200}
        open={open}
        onOpenChange={() => {}}
      >
        <p>Long answer</p>
      </MessageFold>
    );
    const mounted = render(at(true));
    const button = toggle(mounted.container)!;
    let top = 500;
    button.getBoundingClientRect = () => ({ top }) as DOMRect;
    page.scrollTop = 1000;
    act(() => button.click());
    await act(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    top = 100;
    mounted.rerender(at(false));
    expect(page.scrollTop).toBe(1000);
    page.scrollTop = 0;
    mounted.unmount();
  });

  test("a close the controlled host commits after a frame keeps the reader's place", async () => {
    const page = document.scrollingElement as HTMLElement;
    function Host() {
      const [open, setOpen] = useState(true);
      return (
        <MessageFold
          length={300}
          threshold={200}
          open={open}
          onOpenChange={(next) => {
            setTimeout(() => setOpen(next), 60);
          }}
        >
          <p>Long answer</p>
        </MessageFold>
      );
    }
    const mounted = render(<Host />);
    const button = toggle(mounted.container)!;
    // Open, the toggle sits at 500; folded, 400px higher.
    button.getBoundingClientRect = () =>
      ({ top: state(mounted.container) === "open" ? 500 : 100 }) as DOMRect;
    page.scrollTop = 1000;
    act(() => button.click());
    await act(() => new Promise((resolve) => setTimeout(resolve, 80)));
    expect(state(mounted.container)).toBe("folded");
    expect(page.scrollTop).toBe(600);
    page.scrollTop = 0;
    mounted.unmount();
  });

  test("a host that folds it without the toggle keeps the reader's place too", () => {
    const page = document.scrollingElement as HTMLElement;
    const at = (open: boolean) => (
      <MessageFold
        length={300}
        threshold={200}
        open={open}
        onOpenChange={() => {}}
      >
        <p>Long answer</p>
      </MessageFold>
    );
    const mounted = render(at(true));
    const button = toggle(mounted.container)!;
    button.getBoundingClientRect = () =>
      ({ top: state(mounted.container) === "open" ? 500 : 100 }) as DOMRect;
    page.scrollTop = 1000;
    mounted.rerender(at(false));
    expect(page.scrollTop).toBe(600);
    page.scrollTop = 0;
    mounted.unmount();
  });

  test("a fold below the visible area does not move the page", () => {
    const page = document.scrollingElement as HTMLElement;
    const at = (open: boolean) => (
      <MessageFold
        length={300}
        threshold={200}
        open={open}
        onOpenChange={() => {}}
      >
        <p>Long answer</p>
      </MessageFold>
    );
    const mounted = render(at(true));
    const button = toggle(mounted.container)!;
    const below = window.innerHeight + 200;
    button.getBoundingClientRect = () =>
      ({
        top: state(mounted.container) === "open" ? below : below - 400,
      }) as DOMRect;
    page.scrollTop = 1000;
    mounted.rerender(at(false));
    expect(page.scrollTop).toBe(1000);
    page.scrollTop = 0;
    mounted.unmount();
  });

  test("focus moving into the folded part unfolds it", () => {
    const mounted = render(
      <MessageFold length={300} threshold={200}>
        <a href="#later">A link further down</a>
      </MessageFold>,
    );
    expect(state(mounted.container)).toBe("folded");
    act(() => mounted.container.querySelector("a")?.focus());
    expect(state(mounted.container)).toBe("open");
    mounted.unmount();
  });

  test("focusing the toggle does not unfold it", () => {
    const mounted = render(
      <MessageFold length={300} threshold={200}>
        <p>Long answer</p>
      </MessageFold>,
    );
    act(() => toggle(mounted.container)?.focus());
    expect(state(mounted.container)).toBe("folded");
    mounted.unmount();
  });
});

function Counter() {
  const [count, setCount] = useState(0);
  return (
    <button
      type="button"
      data-count={count}
      onClick={() => setCount(count + 1)}
    >
      {count}
    </button>
  );
}

describe("MessageFold keeps its children mounted", () => {
  test("when a long answer finishes streaming", () => {
    const at = (status: "streaming" | "sent") => (
      <Message from="agent" status={status}>
        <MessageFold length={10_000}>
          <Counter />
        </MessageFold>
      </Message>
    );
    const mounted = render(at("streaming"));
    const before = mounted.container.querySelector("button")!;
    act(() => before.click());
    act(() => before.focus());
    mounted.rerender(at("sent"));
    const after = mounted.container.querySelector("[data-count]")!;
    expect(after).toBe(before);
    expect(after.getAttribute("data-count")).toBe("1");
    expect(document.activeElement).toBe(before);
    mounted.unmount();
  });

  test("when the answer grows past the threshold", () => {
    const at = (length: number) => (
      <MessageFold length={length} threshold={100} defaultOpen>
        <Counter />
      </MessageFold>
    );
    const mounted = render(at(50));
    const before = mounted.container.querySelector("button")!;
    act(() => before.click());
    mounted.rerender(at(150));
    expect(mounted.container.querySelector("[data-count]")).toBe(before);
    mounted.unmount();
  });
});
