import { act, memo, useEffect } from "react";
import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import {
  Conversation,
  ConversationContent,
  ConversationItem,
  ConversationScrollButton,
  useConversation,
  type ConversationContextValue,
  type ConversationScrollSnapshot,
} from "./conversation.js";
import {
  ConversationDivider,
  ConversationNotice,
} from "./conversation-divider.js";

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

const nextFrame = () =>
  act(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      }),
  );

function scroller(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>(
    "[data-slot='conversation-content']",
  );
  if (element === null) throw new Error("expected the scroll container");
  return element;
}

/** happy-dom does no layout: give the container a tall content box. */
function giveGeometry(
  element: HTMLElement,
  scrollHeight: number,
  clientHeight: number,
) {
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    value: scrollHeight,
  });
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: clientHeight,
  });
}

describe("Conversation context", () => {
  test("scrolling 100 frames re-renders a memoised child zero times", async () => {
    let renders = 0;
    const Row = memo(function Row() {
      renders += 1;
      return <p>row</p>;
    });
    const seen = new Set<ConversationContextValue>();
    function Probe() {
      const value = useConversation();
      useEffect(() => {
        seen.add(value);
      });
      return null;
    }
    const mounted = render(
      <Conversation>
        <ConversationContent>
          <ConversationItem itemId="a">
            <Row />
          </ConversationItem>
        </ConversationContent>
        <Probe />
      </Conversation>,
    );
    const element = scroller(mounted.container);
    giveGeometry(element, 100_000, 500);
    const rendersAfterMount = renders;
    const valuesAfterMount = seen.size;

    for (let frame = 1; frame <= 100; frame += 1) {
      // The reader's own scrolling, back and forth near the end.
      element.dispatchEvent(new WheelEvent("wheel"));
      element.scrollTop = 99_500 - (frame % 30);
      element.dispatchEvent(new Event("scroll"));
      await nextFrame();
    }

    expect(rendersAfterMount).toBe(1);
    expect(renders).toBe(1);
    // Every scroll stayed within reach of the end, so nothing the context
    // shares changed, and its value kept its identity.
    expect(seen.size).toBe(valuesAfterMount);
    mounted.unmount();
  });

  test("throws a clear error outside a Conversation", () => {
    function Orphan() {
      useConversation();
      return null;
    }
    const container = document.createElement("div");
    const root = createRoot(container);
    const original = console.error;
    console.error = () => {};
    try {
      expect(() => act(() => root.render(<Orphan />))).toThrow(
        "useConversation must be used within <Conversation>",
      );
    } finally {
      console.error = original;
      act(() => root.unmount());
    }
  });
});

describe("ConversationItem registry", () => {
  test("lists items in document order and drops unmounted ones", async () => {
    let api: ConversationContextValue | null = null;
    function Probe() {
      api = useConversation();
      return null;
    }
    const list = (ids: readonly string[]) => (
      <Conversation>
        <ConversationContent>
          {ids.map((id) => (
            <ConversationItem key={id} itemId={id}>
              {id}
            </ConversationItem>
          ))}
        </ConversationContent>
        <Probe />
      </Conversation>
    );
    const mounted = render(list(["b", "c"]));
    const items = () => {
      if (api === null) throw new Error("expected the conversation API");
      return api.items;
    };
    let notified = 0;
    const unsubscribe = items().subscribe(() => {
      notified += 1;
    });

    mounted.rerender(list(["a", "b", "c"]));
    await act(() => Promise.resolve());
    expect(items().ids()).toEqual(["a", "b", "c"]);
    expect(items().get("a")?.textContent).toBe("a");
    expect(notified).toBe(1);

    mounted.rerender(list(["b", "c"]));
    await act(() => Promise.resolve());
    expect(items().ids()).toEqual(["b", "c"]);
    expect(items().get("a")).toBeUndefined();
    expect(notified).toBe(2);

    unsubscribe();
    mounted.unmount();
  });

  test("a null ref drops the item, which is how React 18 detaches", async () => {
    let api: ConversationContextValue | null = null;
    function Probe() {
      api = useConversation();
      return null;
    }
    const mounted = render(
      <Conversation>
        <ConversationContent>
          <ConversationItem itemId="a">a</ConversationItem>
        </ConversationContent>
        <Probe />
      </Conversation>,
    );
    const element =
      mounted.container.querySelector<HTMLElement>("[data-item-id='a']");
    const fiberKey = Object.keys(element ?? {}).find((key) =>
      key.startsWith("__reactFiber$"),
    );
    const fiber =
      element === null || fiberKey === undefined
        ? undefined
        : (element as HTMLElement & Record<string, { ref?: unknown }>)[
            fiberKey
          ];
    const ref = fiber?.ref;
    if (typeof ref !== "function") throw new Error("expected the item ref");
    const items = () => {
      if (api === null) throw new Error("expected the conversation API");
      return api.items;
    };

    act(() => {
      ref(null);
    });
    await act(() => Promise.resolve());
    expect(items().get("a")).toBeUndefined();
    expect(items().ids()).toEqual([]);
    mounted.unmount();
  });
});

describe("ConversationScrollButton", () => {
  test("appears when the end is out of view and hands focus to the log", async () => {
    const mounted = render(
      <Conversation>
        <ConversationContent>
          <ConversationItem itemId="a">a</ConversationItem>
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>,
    );
    const element = scroller(mounted.container);
    const button = () =>
      mounted.container.querySelector<HTMLButtonElement>(
        "[data-slot='conversation-scroll-button']",
      );
    expect(button()).toBeNull();

    giveGeometry(element, 2000, 500);
    element.dispatchEvent(new WheelEvent("wheel"));
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll"));
    await nextFrame();
    expect(button()?.getAttribute("aria-label")).toBe("Scroll to latest");

    act(() => button()?.click());
    expect(document.activeElement).toBe(element);
    mounted.unmount();
  });
});

describe("ConversationContent", () => {
  test("its ref, id, className and naming land on the scroll container", async () => {
    let received: HTMLDivElement | null = null;
    const mounted = render(
      <Conversation>
        <ConversationContent
          ref={(node) => {
            received = node;
          }}
          id="log"
          aria-label="Thread with the agent"
          aria-describedby="hint"
          className="scroll-pt-12"
        >
          <ConversationItem itemId="a">a</ConversationItem>
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>,
    );
    const element = scroller(mounted.container);
    expect(received).not.toBeNull();
    expect(received === element).toBe(true);
    expect(element.getAttribute("role")).toBe("log");
    expect(element.id).toBe("log");
    expect(element.getAttribute("aria-label")).toBe("Thread with the agent");
    expect(element.getAttribute("aria-describedby")).toBe("hint");
    expect(element.classList.contains("scroll-pt-12")).toBe(true);
    const column = element.querySelector("[data-slot='conversation-column']");
    expect(column?.parentElement).toBe(element);
    expect(column?.hasAttribute("id")).toBe(false);

    // The conversation still drives the same element through its own ref.
    giveGeometry(element, 2000, 500);
    element.dispatchEvent(new WheelEvent("wheel"));
    element.scrollTop = 0;
    element.dispatchEvent(new Event("scroll"));
    await nextFrame();
    expect(
      mounted.container.querySelector(
        "[data-slot='conversation-scroll-button']",
      ),
    ).not.toBeNull();
    mounted.unmount();
  });

  test("names the log Conversation unless the host names it", () => {
    const mounted = render(
      <Conversation>
        <ConversationContent />
      </Conversation>,
    );
    expect(scroller(mounted.container).getAttribute("aria-label")).toBe(
      "Conversation",
    );
    mounted.rerender(
      <Conversation>
        <ConversationContent aria-labelledby="title" />
      </Conversation>,
    );
    const element = scroller(mounted.container);
    expect(element.getAttribute("aria-labelledby")).toBe("title");
    expect(element.hasAttribute("aria-label")).toBe(false);
    mounted.unmount();
  });
});

describe("useConversation scroll access", () => {
  function mountWithApi() {
    let api: ConversationContextValue | null = null;
    const seen = new Set<ConversationContextValue>();
    function Probe() {
      const value = useConversation();
      api = value;
      useEffect(() => {
        seen.add(value);
      });
      return null;
    }
    const mounted = render(
      <Conversation>
        <ConversationContent>
          <ConversationItem itemId="a">a</ConversationItem>
        </ConversationContent>
        <Probe />
      </Conversation>,
    );
    const current = () => {
      if (api === null) throw new Error("expected the conversation API");
      return api;
    };
    return { mounted, current, seen };
  }

  test("scrollContainer returns the role=log element", () => {
    const { mounted, current } = mountWithApi();
    const element = current().scrollContainer();
    expect(element === scroller(mounted.container)).toBe(true);
    expect(element?.getAttribute("role")).toBe("log");
    mounted.unmount();
    expect(current().scrollContainer()).toBeNull();
  });

  test("subscribers get one snapshot per frame and the context keeps its identity", async () => {
    const { mounted, current, seen } = mountWithApi();
    const element = scroller(mounted.container);
    giveGeometry(element, 100_000, 500);
    element.scrollTop = 99_500;
    const valuesBefore = seen.size;
    const snapshots: ConversationScrollSnapshot[] = [];
    const unsubscribe = current().subscribeScroll((snapshot) => {
      snapshots.push(snapshot);
    });

    // The mount is owed one snapshot; no reader scrolled.
    await nextFrame();
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]?.byReader).toBe(false);
    expect(snapshots[0]?.delta).toBe(0);
    expect(snapshots[0]?.distanceFromEnd).toBe(0);
    const startTop = 99_500;

    // The reader scrolls up 20 times within one frame, near the end.
    for (let step = 1; step <= 20; step += 1) {
      element.dispatchEvent(new WheelEvent("wheel"));
      element.scrollTop = startTop - step;
      element.dispatchEvent(new Event("scroll"));
    }
    await nextFrame();
    expect(snapshots).toHaveLength(2);
    expect(snapshots[1]).toEqual({
      scrollTop: startTop - 20,
      scrollHeight: 100_000,
      clientHeight: 500,
      distanceFromEnd: 20,
      delta: -20,
      byReader: true,
    });

    // A frame without scrolls notifies nobody.
    await nextFrame();
    expect(snapshots).toHaveLength(2);

    // Once the reader's gesture has gone quiet, a scroll is not theirs. The
    // view still follows the end, so the conversation puts it back there.
    await act(() => new Promise((resolve) => setTimeout(resolve, 200)));
    element.scrollTop = startTop - 25;
    element.dispatchEvent(new Event("scroll"));
    await nextFrame();
    expect(snapshots).toHaveLength(3);
    expect(snapshots[2]?.byReader).toBe(false);
    expect(snapshots[2]?.scrollTop).toBe(startTop);
    expect(snapshots[2]?.delta).toBe(20);

    // Every scroll stayed near the end, so the context value never changed.
    expect(seen.size).toBe(valuesBefore);

    unsubscribe();
    element.dispatchEvent(new WheelEvent("wheel"));
    element.scrollTop = startTop - 30;
    element.dispatchEvent(new Event("scroll"));
    await nextFrame();
    expect(snapshots).toHaveLength(3);
    mounted.unmount();
  });
});

describe("reader attribution and scroll listeners", () => {
  function mountPolicy(policy: "settle" | "stick") {
    let api: ConversationContextValue | null = null;
    function Probe() {
      api = useConversation();
      return null;
    }
    const mounted = render(
      <Conversation scrollPolicy={policy}>
        <ConversationContent>
          <ConversationItem itemId="a">a</ConversationItem>
        </ConversationContent>
        <Probe />
      </Conversation>,
    );
    const current = () => {
      if (api === null) throw new Error("expected the conversation API");
      return api;
    };
    return { mounted, element: scroller(mounted.container), current };
  }

  const sleep = (ms: number) =>
    act(() => new Promise((resolve) => setTimeout(resolve, ms)));

  /** The reader's wheel: input on the container, then the scroll it makes. */
  const wheel = (element: HTMLElement, scrollTop: number) => {
    element.dispatchEvent(new WheelEvent("wheel"));
    element.scrollTop = scrollTop;
    element.dispatchEvent(new Event("scroll"));
  };

  test("the conversation's own follow writes never count as the reader's", async () => {
    const { mounted, element, current } = mountPolicy("stick");
    let scrollHeight = 10_000;
    giveGeometry(element, scrollHeight, 500);
    element.scrollTop = scrollHeight - 500;
    const snapshots: ConversationScrollSnapshot[] = [];
    current().subscribeScroll((snapshot) => snapshots.push(snapshot));
    await nextFrame();

    // One wheel tick, still at the end: the view keeps following.
    wheel(element, scrollHeight - 501);
    await nextFrame();
    expect(snapshots.at(-1)?.byReader).toBe(true);
    const afterWheel = snapshots.length;

    // Streaming every 100ms: the conversation follows the end (as on a resize
    // callback), and its scroll event lands, the first inside the wheel's
    // window.
    for (let round = 0; round < 15; round += 1) {
      await sleep(100);
      scrollHeight += 20;
      giveGeometry(element, scrollHeight, 500);
      current().restoreAnchor();
      element.dispatchEvent(new Event("scroll"));
      await nextFrame();
    }
    const streamed = snapshots.slice(afterWheel);
    expect(streamed).toHaveLength(15);
    expect(streamed.every((snapshot) => !snapshot.byReader)).toBe(true);
    expect(snapshots.at(-1)?.scrollTop).toBe(scrollHeight - 500);
    mounted.unmount();
  });

  /** A flick: a finger down, a short drag, lifted; momentum follows. */
  const flick = (element: HTMLElement, scrollTop: number) => {
    element.dispatchEvent(new Event("touchstart"));
    element.dispatchEvent(new Event("touchmove"));
    element.scrollTop = scrollTop;
    element.dispatchEvent(new Event("scroll"));
    element.dispatchEvent(new Event("touchend"));
  };

  test("momentum after a flick stays the reader's and keeps a follow broken", async () => {
    const { mounted, element, current } = mountPolicy("stick");
    giveGeometry(element, 10_000, 500);
    element.scrollTop = 9_500;
    const snapshots: ConversationScrollSnapshot[] = [];
    current().subscribeScroll((snapshot) => snapshots.push(snapshot));
    await nextFrame();
    const afterMount = snapshots.length;

    // The drag itself stays within the end threshold: still following.
    flick(element, 9_490);
    await nextFrame();
    // Momentum: no input, a scroll every 50ms for 800ms, away from the end.
    let top = 9_490;
    for (let tick = 0; tick < 16; tick += 1) {
      await sleep(50);
      top -= 40;
      element.scrollTop = top;
      element.dispatchEvent(new Event("scroll"));
      await nextFrame();
    }
    const flicked = snapshots.slice(afterMount);
    expect(flicked).toHaveLength(17);
    expect(flicked.every((snapshot) => snapshot.byReader)).toBe(true);
    // The follow broke and stays broken: content growing does not pull the
    // view back to the end.
    expect(element.scrollTop).toBe(top);
    giveGeometry(element, 10_200, 500);
    current().restoreAnchor();
    expect(element.scrollTop).toBe(top);
    mounted.unmount();
  });

  test("scrolls after the momentum cap are not the reader's", async () => {
    const { mounted, element, current } = mountPolicy("stick");
    giveGeometry(element, 10_000, 500);
    element.scrollTop = 9_500;
    const seen: { at: number; byReader: boolean }[] = [];
    current().subscribeScroll((snapshot) =>
      seen.push({ at: performance.now(), byReader: snapshot.byReader }),
    );
    await nextFrame();

    flick(element, 9_000);
    const lifted = performance.now();
    let top = 9_000;
    while (performance.now() - lifted < 2_600) {
      await sleep(100);
      top -= 10;
      element.scrollTop = top;
      element.dispatchEvent(new Event("scroll"));
      await nextFrame();
    }
    const early = seen.filter(({ at }) => at > lifted && at - lifted < 1_800);
    const late = seen.filter(({ at }) => at - lifted > 2_200);
    expect(early.length).toBeGreaterThan(10);
    expect(early.every(({ byReader }) => byReader)).toBe(true);
    expect(late.length).toBeGreaterThan(0);
    expect(late.every(({ byReader }) => !byReader)).toBe(true);
    mounted.unmount();
  });

  test("a glide started inside the reader's window is not the reader's", async () => {
    const { mounted, element, current } = mountPolicy("settle");
    giveGeometry(element, 10_000, 500);
    element.scrollTop = 9_500;
    const snapshots: ConversationScrollSnapshot[] = [];
    current().subscribeScroll((snapshot) => snapshots.push(snapshot));
    await nextFrame();

    wheel(element, 5_000);
    current().scrollToEnd();
    await nextFrame();
    expect(snapshots.at(-1)?.byReader).toBe(true);
    const afterWheel = snapshots.length;
    for (let frame = 0; frame < 5; frame += 1) {
      element.dispatchEvent(new Event("scroll"));
      await nextFrame();
    }
    const glided = snapshots.slice(afterWheel);
    expect(glided.length).toBeGreaterThan(0);
    expect(glided.every((snapshot) => !snapshot.byReader)).toBe(true);
    expect(element.scrollTop).toBeGreaterThan(5_000);
    mounted.unmount();
  });

  test("a throwing listener neither stops the others nor the atBottom update", async () => {
    const { mounted, element, current } = mountPolicy("settle");
    giveGeometry(element, 10_000, 500);
    element.scrollTop = 9_500;
    await nextFrame();
    const reported: unknown[] = [];
    const original = globalThis.reportError;
    globalThis.reportError = (error: unknown) => {
      reported.push(error);
    };
    try {
      let second = 0;
      const failure = new Error("listener failed");
      current().subscribeScroll(() => {
        throw failure;
      });
      current().subscribeScroll(() => {
        second += 1;
      });
      wheel(element, 1_000);
      await nextFrame();
      expect(second).toBe(1);
      expect(reported).toEqual([failure]);
      expect(current().atBottom).toBe(false);
    } finally {
      globalThis.reportError = original;
      mounted.unmount();
    }
  });

  test("each listener is called once per frame, even if it resubscribes", async () => {
    const { mounted, element, current } = mountPolicy("settle");
    giveGeometry(element, 10_000, 500);
    element.scrollTop = 9_500;
    const calls: ConversationScrollSnapshot[] = [];
    let unsubscribe = () => {};
    let resubscribed = false;
    const listener = (snapshot: ConversationScrollSnapshot) => {
      calls.push(snapshot);
      if (resubscribed) return;
      resubscribed = true;
      unsubscribe();
      unsubscribe = current().subscribeScroll(listener);
    };
    unsubscribe = current().subscribeScroll(listener);
    await nextFrame();
    expect(calls).toHaveLength(1);

    // A listener unsubscribed by an earlier one in the same frame is skipped.
    let lateCalls = 0;
    let unsubscribeLate = () => {};
    current().subscribeScroll(() => unsubscribeLate());
    unsubscribeLate = current().subscribeScroll(() => {
      lateCalls += 1;
    });
    wheel(element, 9_000);
    await nextFrame();
    expect(calls).toHaveLength(2);
    expect(lateCalls).toBe(0);
    unsubscribe();
    mounted.unmount();
  });
});

describe("ConversationDivider and ConversationNotice", () => {
  test("a bare divider is a separator; a labelled one reads its label", () => {
    const mounted = render(
      <>
        <ConversationDivider data-testid="bare" />
        <ConversationDivider data-testid="day">Today</ConversationDivider>
      </>,
    );
    const bare = mounted.container.querySelector("[data-testid='bare']");
    const day = mounted.container.querySelector("[data-testid='day']");
    expect(bare?.getAttribute("role")).toBe("separator");
    expect(day?.getAttribute("role")).toBeNull();
    expect(day?.textContent).toBe("Today");
    mounted.unmount();
  });

  test("a notice hides its decorative icon", () => {
    const mounted = render(
      <ConversationNotice icon={<svg data-testid="mark" />}>
        A run was scheduled
      </ConversationNotice>,
    );
    const mark = mounted.container.querySelector("[data-testid='mark']");
    expect(mark?.parentElement?.getAttribute("aria-hidden")).toBe("true");
    expect(mounted.container.textContent).toBe("A run was scheduled");
    mounted.unmount();
  });
});
