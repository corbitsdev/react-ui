import { act, createRef, memo, useEffect } from "react";
import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationItem,
  ConversationScrollButton,
  useConversation,
  type ConversationContextValue,
  type ConversationProps,
  type ConversationScrollPolicy,
  type ConversationScrollSnapshot,
} from "./conversation.js";
import {
  ConversationDivider,
  ConversationNotice,
} from "./conversation-divider.js";
import { clampScrollTop } from "../lib/conversation-scroll.js";

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

/** A Conversation over items `ids`, re-rendered with new props by `update`. */
function mountConversation(
  props: ConversationProps = {},
  ids: readonly string[] = ["a"],
) {
  let api: ConversationContextValue | null = null;
  function Probe() {
    api = useConversation();
    return null;
  }
  const tree = (next: ConversationProps) => (
    <Conversation {...next}>
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
  const mounted = render(tree(props));
  const current = () => {
    if (api === null) throw new Error("expected the conversation API");
    return api;
  };
  const element = scroller(mounted.container);
  const spacer = () => {
    const found = element.querySelector<HTMLElement>(
      "[data-slot='conversation-reserve']",
    );
    if (found === null) throw new Error("expected the reserve");
    return found;
  };
  return {
    mounted,
    element,
    current,
    spacer,
    update: (next: ConversationProps) => mounted.rerender(tree(next)),
  };
}

const mountPolicy = (policy: ConversationScrollPolicy) =>
  mountConversation({ scrollPolicy: policy });

const sleep = (ms: number) =>
  act(() => new Promise((resolve) => setTimeout(resolve, ms)));

/** The reader's wheel: input on the container, then the scroll it makes. */
const wheel = (element: HTMLElement, scrollTop: number) => {
  element.dispatchEvent(new WheelEvent("wheel"));
  element.scrollTop = scrollTop;
  element.dispatchEvent(new Event("scroll"));
};

/** A flick: a finger down, a short drag, lifted; momentum follows. */
const flick = (element: HTMLElement, scrollTop: number) => {
  element.dispatchEvent(new Event("touchstart"));
  element.dispatchEvent(new Event("touchmove"));
  element.scrollTop = scrollTop;
  element.dispatchEvent(new Event("scroll"));
  element.dispatchEvent(new Event("touchend"));
};

/** A scroll no input explains: focus moving, or find in page. */
const pageScroll = (element: HTMLElement, scrollTop: number) => {
  element.scrollTop = scrollTop;
  element.dispatchEvent(new Event("scroll"));
};

const ITEM_HEIGHT = 1_000;
const VIEW_HEIGHT = 500;
const TEN = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"] as const;

/**
 * Lays the items out as a browser would: stacked `ITEM_HEIGHT` apart in a
 * `VIEW_HEIGHT` view, with `scrollTop` clamped to the content. `layout(height)`
 * changes the content's height, clamping the view as the browser does.
 */
function layOut(element: HTMLElement, ids: readonly string[]) {
  let height = ids.length * ITEM_HEIGHT;
  let top = element.scrollTop;
  Object.defineProperty(element, "scrollHeight", {
    configurable: true,
    get: () => height,
  });
  Object.defineProperty(element, "clientHeight", {
    configurable: true,
    value: VIEW_HEIGHT,
  });
  Object.defineProperty(element, "scrollTop", {
    configurable: true,
    get: () => top,
    set: (value: number) => {
      top = clampScrollTop(value, height, VIEW_HEIGHT);
    },
  });
  element.getBoundingClientRect = () =>
    ({ top: 0, bottom: VIEW_HEIGHT, height: VIEW_HEIGHT }) as DOMRect;
  ids.forEach((id, index) => {
    const item = element.querySelector<HTMLElement>(`[data-item-id='${id}']`);
    if (item === null) throw new Error(`expected item ${id}`);
    item.getBoundingClientRect = () => {
      const itemTop = index * ITEM_HEIGHT - top;
      return {
        top: itemTop,
        bottom: itemTop + ITEM_HEIGHT,
        height: ITEM_HEIGHT,
      } as DOMRect;
    };
  });
  return {
    layout(next: number) {
      height = next;
      top = clampScrollTop(top, height, VIEW_HEIGHT);
    },
  };
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

  test("reaching the end another way hands its focus to the log", async () => {
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
    giveGeometry(element, 2000, 500);
    wheel(element, 0);
    await nextFrame();
    act(() => button()?.focus());
    expect(document.activeElement === button()).toBe(true);

    // The reader wheels back to the end with the button focused: it leaves.
    wheel(element, 1500);
    await nextFrame();
    expect(button()).toBeNull();
    expect(document.activeElement === element).toBe(true);
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

  test("the log, an item and the scroll button forward a host ref", async () => {
    // React 18 drops `ref` from a function component's props: only a
    // forwardRef component receives it there.
    for (const part of [
      ConversationContent,
      ConversationItem,
      ConversationScrollButton,
    ]) {
      expect(part.$$typeof).toBe(Symbol.for("react.forward_ref"));
    }
    const log = createRef<HTMLDivElement>();
    const item = createRef<HTMLDivElement>();
    const button = createRef<HTMLButtonElement>();
    const mounted = render(
      <Conversation>
        <ConversationContent ref={log}>
          <ConversationItem ref={item} itemId="a">
            a
          </ConversationItem>
        </ConversationContent>
        <ConversationScrollButton ref={button} />
      </Conversation>,
    );
    const element = scroller(mounted.container);
    expect(log.current === element).toBe(true);
    expect(item.current?.dataset.itemId).toBe("a");
    expect(button.current).toBeNull();

    giveGeometry(element, 2000, 500);
    wheel(element, 0);
    await nextFrame();
    expect(button.current?.dataset.slot).toBe("conversation-scroll-button");
    mounted.unmount();
    expect(log.current).toBeNull();
    expect(item.current).toBeNull();
    expect(button.current).toBeNull();
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
    // A clock the test moves, so a slow machine can't stretch the gap
    // between two scrolls past the gesture's quiet window.
    let now = 0;
    const originalNow = performance.now.bind(performance);
    performance.now = () => now;
    try {
      const { mounted, element, current } = mountPolicy("stick");
      giveGeometry(element, 10_000, 500);
      element.scrollTop = 9_500;
      const seen: { at: number; byReader: boolean }[] = [];
      current().subscribeScroll((snapshot) =>
        seen.push({ at: now, byReader: snapshot.byReader }),
      );
      await nextFrame();

      flick(element, 9_000);
      const lifted = now;
      let top = 9_000;
      while (now - lifted < 2_600) {
        now += 100;
        top -= 10;
        element.scrollTop = top;
        element.dispatchEvent(new Event("scroll"));
        await nextFrame();
      }
      const early = seen.filter(({ at }) => at > lifted && at - lifted < 2_000);
      const late = seen.filter(({ at }) => at - lifted > 2_000);
      expect(early).toHaveLength(19);
      expect(early.every(({ byReader }) => byReader)).toBe(true);
      expect(late).toHaveLength(6);
      expect(late.every(({ byReader }) => !byReader)).toBe(true);
      mounted.unmount();
    } finally {
      performance.now = originalNow;
    }
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

describe("a scroll no input explains", () => {
  for (const policy of ["settle", "stick"] as const) {
    test(`leaving the end while following is kept and breaks the follow (${policy})`, async () => {
      const { mounted, element, current } = mountPolicy(policy);
      giveGeometry(element, 10_000, 500);
      element.scrollTop = 9_500;
      await nextFrame();

      // Focus moving to an earlier item scrolls it into view, with no wheel,
      // touch, key or pointer on the log.
      element.scrollTop = 7_000;
      element.dispatchEvent(new Event("scroll"));
      await nextFrame();
      expect(element.scrollTop).toBe(7_000);
      expect(current().atBottom).toBe(false);

      // The follow is broken: growth no longer pulls the view to the end.
      giveGeometry(element, 10_200, 500);
      current().restoreAnchor();
      expect(element.scrollTop).toBe(7_000);
      mounted.unmount();
    });
  }
});

describe("a glide and the reader's scrolls", () => {
  test("reader momentum during a glide cancels it", async () => {
    const { mounted, element, current } = mountPolicy("stick");
    giveGeometry(element, 10_000, 500);
    element.scrollTop = 9_500;
    const snapshots: ConversationScrollSnapshot[] = [];
    current().subscribeScroll((snapshot) => snapshots.push(snapshot));
    await nextFrame();
    flick(element, 9_000);
    await nextFrame();
    current().scrollToEnd();
    await nextFrame();

    // The flick's momentum keeps moving the view up under the glide.
    element.scrollTop = 8_000;
    element.dispatchEvent(new Event("scroll"));
    await nextFrame();
    expect(snapshots.at(-1)?.byReader).toBe(true);
    await sleep(800);
    expect(element.scrollTop).toBe(8_000);
    mounted.unmount();
  });

  test("momentum that outlasts the cancelled glide stays the reader's", async () => {
    const { mounted, element, current } = mountPolicy("stick");
    giveGeometry(element, 10_000, 500);
    element.scrollTop = 9_500;
    const snapshots: ConversationScrollSnapshot[] = [];
    current().subscribeScroll((snapshot) => snapshots.push(snapshot));
    await nextFrame();
    flick(element, 9_000);
    await nextFrame();
    current().scrollToEnd();

    // A tick every 50ms through what would have been the glide and after it.
    for (let tick = 0; tick < 16; tick += 1) {
      await sleep(50);
      const top = element.scrollTop - 30;
      element.scrollTop = top;
      element.dispatchEvent(new Event("scroll"));
      await nextFrame();
      expect(element.scrollTop).toBe(top);
      expect(snapshots.at(-1)?.byReader).toBe(true);
    }
    mounted.unmount();
  });

  test("a key that does not scroll leaves a glide alone", async () => {
    const { mounted, element, current } = mountPolicy("settle");
    giveGeometry(element, 10_000, 500);
    element.scrollTop = 1_000;
    await nextFrame();
    current().scrollToEnd();
    await nextFrame();
    await nextFrame();
    element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Shift", bubbles: true }),
    );
    await sleep(900);
    expect(element.scrollTop).toBe(9_500);
    mounted.unmount();
  });

  test("Space on a control inside an item leaves a glide alone", async () => {
    const { mounted, element, current } = mountPolicy("settle");
    giveGeometry(element, 10_000, 500);
    element.scrollTop = 1_000;
    const button = document.createElement("button");
    element.querySelector("[data-slot='conversation-item']")?.append(button);
    await nextFrame();
    current().scrollToEnd();
    await nextFrame();
    await nextFrame();
    // Space activates the button; it does not scroll the log.
    button.dispatchEvent(
      new KeyboardEvent("keydown", { key: " ", bubbles: true }),
    );
    await sleep(900);
    expect(element.scrollTop).toBe(9_500);

    // An arrow key on the same button does scroll the log.
    element.scrollTop = 1_000;
    current().scrollToEnd();
    await nextFrame();
    await nextFrame();
    button.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }),
    );
    const stoppedAt = element.scrollTop;
    await sleep(900);
    expect(element.scrollTop).toBe(stoppedAt);
    expect(stoppedAt).toBeLessThan(9_500);
    mounted.unmount();
  });

  test("a scroll key cancels a glide", async () => {
    const { mounted, element, current } = mountPolicy("settle");
    giveGeometry(element, 10_000, 500);
    element.scrollTop = 1_000;
    await nextFrame();
    current().scrollToEnd();
    await nextFrame();
    await nextFrame();
    element.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowUp", bubbles: true }),
    );
    const stoppedAt = element.scrollTop;
    await sleep(900);
    expect(element.scrollTop).toBe(stoppedAt);
    expect(stoppedAt).toBeLessThan(9_500);
    mounted.unmount();
  });
});

describe("scrollToItem's onEnd", () => {
  test("reports arriving, being cancelled and being replaced", async () => {
    const { mounted, element, current } = mountConversation({}, TEN);
    layOut(element, TEN);
    const ends: string[] = [];
    const report = (label: string) => (arrived: boolean) =>
      ends.push(`${label}:${arrived}`);
    await nextFrame();

    current().scrollToItem("b", { onEnd: report("b") });
    await sleep(900);
    expect(element.scrollTop).toBe(1_000);
    expect(ends).toEqual(["b:true"]);

    // The reader's wheel stops the glide, even without moving the view.
    current().scrollToItem("h", { onEnd: report("h") });
    await nextFrame();
    element.dispatchEvent(new WheelEvent("wheel"));
    expect(ends).toEqual(["b:true", "h:false"]);

    // Another glide replaces the one in flight.
    current().scrollToItem("j", { onEnd: report("j") });
    current().scrollToEnd();
    expect(ends).toEqual(["b:true", "h:false", "j:false"]);

    // An id with nothing mounted never glides.
    current().scrollToItem("elsewhere", { onEnd: report("elsewhere") });
    expect(ends).toEqual(["b:true", "h:false", "j:false", "elsewhere:false"]);
    await sleep(900);
    expect(ends).toHaveLength(4);
    mounted.unmount();
  });
});

describe("a scroll right after a resize", () => {
  const OriginalResizeObserver = globalThis.ResizeObserver;
  let resized: (() => void)[] = [];
  beforeEach(() => {
    resized = [];
    globalThis.ResizeObserver = class {
      constructor(callback: () => void) {
        resized.push(callback);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver;
  });
  afterEach(() => {
    globalThis.ResizeObserver = OriginalResizeObserver;
  });
  /** The resize callback the browser runs after a layout change. */
  const fireResize = () =>
    act(() => {
      for (const callback of resized) callback();
    });

  test("following, a page scroll away from the end is kept (stick)", async () => {
    const { mounted, element, current } = mountConversation(
      { scrollPolicy: "stick" },
      TEN,
    );
    const { layout } = layOut(element, TEN);
    fireResize();
    await sleep(150);
    expect(element.scrollTop).toBe(9_500);

    // Streaming: the content grows and the view follows it.
    layout(10_040);
    fireResize();
    expect(element.scrollTop).toBe(9_540);
    // Find in page moves the view to an earlier item before the next chunk.
    pageScroll(element, 2_000);
    await nextFrame();
    expect(element.scrollTop).toBe(2_000);
    expect(current().atBottom).toBe(false);

    // The follow is broken: the next chunk leaves the view where it is.
    layout(10_080);
    fireResize();
    expect(element.scrollTop).toBe(2_000);
    mounted.unmount();
  });

  test("not following, a page scroll survives the next resize (settle)", async () => {
    const { mounted, element } = mountConversation({}, TEN);
    const { layout } = layOut(element, TEN);
    await nextFrame();
    wheel(element, 6_000);
    await sleep(200);

    layout(10_040);
    fireResize();
    expect(element.scrollTop).toBe(6_000);
    pageScroll(element, 2_000);
    await nextFrame();
    expect(element.scrollTop).toBe(2_000);

    layout(10_080);
    fireResize();
    expect(element.scrollTop).toBe(2_000);
    mounted.unmount();
  });

  test("the resize's own clamp is not taken as where the reader is", async () => {
    const { mounted, element } = mountConversation({}, TEN);
    const { layout } = layOut(element, TEN);
    await nextFrame();
    wheel(element, 6_000);
    await sleep(200);

    // Content below the view collapses: the browser clamps the view to the
    // new end, and the resize callback cannot put it back yet.
    layout(6_300);
    fireResize();
    pageScroll(element, element.scrollTop);
    expect(element.scrollTop).toBe(5_800);
    await nextFrame();

    // Once the content is back, so is the view.
    layout(10_000);
    fireResize();
    expect(element.scrollTop).toBe(6_000);
    mounted.unmount();
  });
});

describe("a remounted log", () => {
  /** Lays the items out as soon as the log mounts, before it attaches. */
  const layOutTen = (node: HTMLDivElement | null) => {
    if (node !== null) layOut(node, TEN);
  };
  const tree = (policy: ConversationScrollPolicy, mount: number) => (
    <Conversation scrollPolicy={policy}>
      <ConversationContent key={mount} ref={layOutTen}>
        {TEN.map((id) => (
          <ConversationItem key={id} itemId={id}>
            {id}
          </ConversationItem>
        ))}
      </ConversationContent>
    </Conversation>
  );

  for (const policy of ["settle", "stick"] as const) {
    test(`opens where the reader was, not at the top (${policy})`, async () => {
      const mounted = render(tree(policy, 0));
      const before = scroller(mounted.container);
      await nextFrame();
      expect(before.scrollTop).toBe(9_500);
      wheel(before, 6_000);
      await nextFrame();

      mounted.rerender(tree(policy, 1));
      const after = scroller(mounted.container);
      expect(after === before).toBe(false);
      expect(after.scrollTop).toBe(6_000);
      mounted.unmount();
    });
  }

  test("opens at the end while it follows", async () => {
    const mounted = render(tree("stick", 0));
    await nextFrame();
    mounted.rerender(tree("stick", 1));
    expect(scroller(mounted.container).scrollTop).toBe(9_500);
    mounted.unmount();
  });
});

describe("sentId", () => {
  test("the value at mount is history: nothing settles, the view follows", async () => {
    const { mounted, element, current, spacer, update } = mountConversation(
      { sentId: "a" },
      ["a", "b"],
    );
    giveGeometry(element, 10_000, 500);
    element.scrollTop = 9_500;
    await nextFrame();
    expect(spacer().style.height).toBe("");
    giveGeometry(element, 10_200, 500);
    current().restoreAnchor();
    expect(element.scrollTop).toBe(9_700);

    // The next change is a send.
    update({ sentId: "b" });
    expect(spacer().style.height).toBe("500px");
    mounted.unmount();
  });

  test("an id that is not an item does not glide under stick", async () => {
    const { mounted, element, update } = mountConversation({
      scrollPolicy: "stick",
    });
    giveGeometry(element, 10_000, 500);
    element.scrollTop = 9_500;
    await nextFrame();
    wheel(element, 1_000);
    await sleep(200);
    update({ scrollPolicy: "stick", sentId: "elsewhere" });
    await sleep(800);
    expect(element.scrollTop).toBe(1_000);
    mounted.unmount();
  });

  test("an id that is not an item keeps the reserve under settle", async () => {
    const { mounted, element, spacer, update } = mountConversation();
    giveGeometry(element, 10_000, 500);
    element.scrollTop = 9_500;
    await nextFrame();
    update({ sentId: "a" });
    expect(spacer().style.height).toBe("500px");
    update({ sentId: "elsewhere" });
    await act(() => Promise.resolve());
    expect(spacer().style.height).toBe("500px");
    expect(element.scrollTop).toBe(9_500);
    mounted.unmount();
  });

  test("an id that is not an item keeps the follow under settle", async () => {
    const { mounted, element, current, update } = mountConversation();
    giveGeometry(element, 10_000, 500);
    element.scrollTop = 9_500;
    await nextFrame();
    update({ sentId: "elsewhere" });
    giveGeometry(element, 10_200, 500);
    current().restoreAnchor();
    expect(element.scrollTop).toBe(9_700);
    mounted.unmount();
  });
});

describe("scrollPolicy changing mid-life", () => {
  test("stick to settle: back at the end, the view no longer follows", async () => {
    const { mounted, element, current, update } = mountPolicy("stick");
    giveGeometry(element, 10_000, 500);
    element.scrollTop = 9_500;
    await nextFrame();
    update({ scrollPolicy: "settle" });
    expect(
      mounted.container
        .querySelector("[data-slot='conversation']")
        ?.getAttribute("data-scroll-policy"),
    ).toBe("settle");
    wheel(element, 1_000);
    wheel(element, 9_500);
    giveGeometry(element, 10_200, 500);
    current().restoreAnchor();
    expect(element.scrollTop).toBe(9_500);
    mounted.unmount();
  });

  test("settle to stick: following is taken from where the view is", async () => {
    const { mounted, element, current, update } = mountPolicy("settle");
    giveGeometry(element, 10_000, 500);
    element.scrollTop = 9_500;
    await nextFrame();
    // Under settle, the reader leaving and coming back does not re-follow.
    wheel(element, 1_000);
    wheel(element, 9_500);
    update({ scrollPolicy: "stick" });
    giveGeometry(element, 10_200, 500);
    current().restoreAnchor();
    expect(element.scrollTop).toBe(9_700);

    // Switched while away from the end, it does not follow.
    wheel(element, 1_000);
    update({ scrollPolicy: "settle" });
    update({ scrollPolicy: "stick" });
    giveGeometry(element, 10_400, 500);
    current().restoreAnchor();
    expect(element.scrollTop).toBe(1_000);
    mounted.unmount();
  });
});

describe("ConversationEmptyState", () => {
  test("shows a default title, or the host's children instead", () => {
    const mounted = render(
      <ConversationEmptyState description="Ask the agent anything." />,
    );
    const slot = mounted.container.querySelector(
      "[data-slot='conversation-empty-state']",
    );
    expect(slot?.textContent).toContain("No messages yet");
    expect(slot?.textContent).toContain("Ask the agent anything.");

    mounted.rerender(
      <ConversationEmptyState title="Unused">
        <p>Start a workflow</p>
      </ConversationEmptyState>,
    );
    const replaced = mounted.container.querySelector(
      "[data-slot='conversation-empty-state']",
    );
    expect(replaced?.textContent).toBe("Start a workflow");
    expect(replaced?.querySelector("[data-slot='empty-state']")).toBeNull();
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
