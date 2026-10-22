import { act } from "react";
import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  Conversation,
  ConversationContent,
  ConversationItem,
} from "./conversation.js";
import { ConversationEarlier } from "./conversation-earlier.js";

/** happy-dom never reports intersections: record observers and drive them. */
class FakeObserver {
  static live = new Set<FakeObserver>();
  readonly observed = new Set<Element>();
  readonly observes: Element[] = [];

  constructor(
    readonly callback: IntersectionObserverCallback,
    readonly options: IntersectionObserverInit = {},
  ) {}

  observe(target: Element) {
    FakeObserver.live.add(this);
    this.observed.add(target);
    this.observes.push(target);
  }

  unobserve(target: Element) {
    this.observed.delete(target);
  }

  disconnect() {
    this.observed.clear();
    FakeObserver.live.delete(this);
  }

  /** Reports every observed element as in reach. */
  intersect() {
    const records = [...this.observed].map(
      (target) =>
        ({ target, isIntersecting: true }) as IntersectionObserverEntry,
    );
    // The cast stands in for the parts of an entry this component never reads.
    this.callback(records, this as unknown as IntersectionObserver);
  }
}

const original = globalThis.IntersectionObserver;
beforeEach(() => {
  FakeObserver.live.clear();
  globalThis.IntersectionObserver =
    FakeObserver as unknown as typeof IntersectionObserver;
});

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
  globalThis.IntersectionObserver = original;
});

function render(node: ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root!: Root;
  act(() => {
    root = createRoot(container);
    root.render(node);
  });
  cleanups.push(() => {
    act(() => root.unmount());
    container.remove();
  });
  return {
    container,
    rerender: (next: ReactElement) => act(() => root.render(next)),
  };
}

const observer = () => {
  const [only, ...rest] = FakeObserver.live;
  if (only === undefined || rest.length > 0)
    throw new Error(`expected one observer, found ${FakeObserver.live.size}`);
  return only;
};

function Marker({
  ids = ["a"],
  ...props
}: {
  ids?: string[];
  hasEarlier?: boolean;
  loading?: boolean;
  stalled?: boolean;
  onReachStart: () => void;
}) {
  return (
    <Conversation>
      <ConversationContent>
        <ConversationEarlier hasEarlier {...props} />
        {ids.map((id) => (
          <ConversationItem key={id} itemId={id}>
            {id}
          </ConversationItem>
        ))}
      </ConversationContent>
    </Conversation>
  );
}

const marker = (container: HTMLElement) =>
  container.querySelector<HTMLElement>("[data-slot='conversation-earlier']");

describe("ConversationEarlier", () => {
  test("renders nothing without earlier items", () => {
    const { container } = render(
      <Marker hasEarlier={false} onReachStart={() => {}} />,
    );
    expect(marker(container)).toBeNull();
    expect(FakeObserver.live.size).toBe(0);
  });

  test("asks for more when it comes within reach of the view", () => {
    let reached = 0;
    const { container } = render(
      <Marker onReachStart={() => (reached += 1)} />,
    );
    const scroller = container.querySelector(
      "[data-slot='conversation-content']",
    );
    expect(observer().options.root).toBe(scroller);
    expect(observer().options.rootMargin).toBe("1200px 0px 0px 0px");
    act(() => observer().intersect());
    expect(reached).toBe(1);
    expect(marker(container)?.textContent).toBe("Earlier messages");
  });

  test("looks again when the conversation's items change", async () => {
    const { rerender } = render(<Marker onReachStart={() => {}} />);
    const watching = observer();
    expect(watching.observes).toHaveLength(1);
    rerender(<Marker ids={["z", "a"]} onReachStart={() => {}} />);
    // The registry tells its listeners once per microtask.
    await act(async () => {});
    expect(watching.observes).toHaveLength(2);
  });

  test("shows the load and stops asking while it is in flight", () => {
    const { container } = render(<Marker loading onReachStart={() => {}} />);
    expect(FakeObserver.live.size).toBe(0);
    const element = marker(container);
    expect(element?.getAttribute("aria-busy")).toBe("true");
    expect(element?.dataset["state"]).toBe("loading");
    expect(element?.textContent).toBe("Loading earlier messages…");
  });

  test("stalled, it stops asking and offers a button that asks again", () => {
    let reached = 0;
    const { container } = render(
      <Marker stalled onReachStart={() => (reached += 1)} />,
    );
    expect(FakeObserver.live.size).toBe(0);
    const button = container.querySelector("button");
    expect(button?.textContent).toBe("Load earlier messages");
    act(() => button?.click());
    expect(reached).toBe(1);
  });

  test("a retry keeps focus in the marker, and returns it to the button", () => {
    const { container, rerender } = render(
      <Marker stalled onReachStart={() => {}} />,
    );
    const button = container.querySelector("button");
    if (button === null) throw new Error("expected the retry button");
    button.focus();
    act(() => button.click());
    rerender(<Marker loading onReachStart={() => {}} />);
    expect(document.activeElement).not.toBe(document.body);
    expect(document.activeElement).toBe(marker(container));

    rerender(<Marker stalled onReachStart={() => {}} />);
    expect(document.activeElement).toBe(container.querySelector("button"));
  });

  test("when the last page lands, focus moves from the marker to the log", () => {
    const { container, rerender } = render(
      <Marker stalled onReachStart={() => {}} />,
    );
    const button = container.querySelector("button");
    if (button === null) throw new Error("expected the retry button");
    button.focus();
    act(() => button.click());
    rerender(<Marker loading onReachStart={() => {}} />);
    expect(document.activeElement).toBe(marker(container));

    rerender(<Marker hasEarlier={false} onReachStart={() => {}} />);
    expect(marker(container)).toBeNull();
    expect(document.activeElement).toBe(
      container.querySelector("[role='log']"),
    );
  });
});
