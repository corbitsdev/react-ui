import { act, Activity, useEffect } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test } from "bun:test";

import {
  Conversation,
  ConversationContent,
  ConversationItem,
} from "../ui/conversation.js";
import {
  useHistoryWindow,
  type HistoryWindow,
  type UseHistoryWindowOptions,
} from "./use-history-window.js";

type Row = { readonly id: string };

const rows = (from: number, to: number): Row[] =>
  Array.from({ length: to - from }, (_, index) => ({ id: `r${from + index}` }));

type Harness = {
  readonly result: { current: HistoryWindow<Row> };
  /** React commits of the host component since mount. */
  readonly commits: () => number;
  update(options: UseHistoryWindowOptions<Row>): void;
  leaveBottom(): Promise<void>;
  /** The reader scrolls away from the end, and the next frame has not run. */
  leaveBottomUnseen(): void;
  /** The view moves away from the end with no reader input (layout, a glide). */
  driftFromBottom(): Promise<void>;
  returnToBottom(): Promise<void>;
};

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup();
});

const nextFrame = () =>
  act(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve());
      }),
  );

function mount(
  initial: UseHistoryWindowOptions<Row>,
): Harness & { setHidden(hidden: boolean): void } {
  const result: { current: HistoryWindow<Row> } = {
    current: {
      items: [],
      hasEarlier: false,
      loading: false,
      stalled: false,
      reachStart: () => {},
    },
  };
  let commits = 0;

  function Host({ options }: { options: UseHistoryWindowOptions<Row> }) {
    const history = useHistoryWindow(options);
    result.current = history;
    useEffect(() => {
      commits += 1;
    });
    return (
      <ConversationContent>
        {history.items.map((row) => (
          <ConversationItem key={row.id} itemId={row.id}>
            {row.id}
          </ConversationItem>
        ))}
      </ConversationContent>
    );
  }

  const container = document.createElement("div");
  document.body.appendChild(container);
  let root!: Root;
  let latest = initial;
  let hidden = false;
  const render = (options: UseHistoryWindowOptions<Row>) => {
    latest = options;
    root.render(
      <Activity mode={hidden ? "hidden" : "visible"}>
        <Conversation>
          <Host options={options} />
        </Conversation>
      </Activity>,
    );
  };
  act(() => {
    root = createRoot(container);
    render(initial);
  });
  cleanups.push(() => {
    act(() => root.unmount());
    container.remove();
  });

  const scroller = container.querySelector<HTMLElement>(
    "[data-slot='conversation-content']",
  );
  if (scroller === null) throw new Error("expected the scroll container");
  // happy-dom does no layout: give the container a tall content box.
  Object.defineProperty(scroller, "scrollHeight", {
    configurable: true,
    value: 100_000,
  });
  Object.defineProperty(scroller, "clientHeight", {
    configurable: true,
    value: 500,
  });
  const scroll = (top: number, byReader: boolean) => {
    if (byReader) scroller.dispatchEvent(new WheelEvent("wheel"));
    scroller.scrollTop = top;
    scroller.dispatchEvent(new Event("scroll"));
  };
  /** A scroll to `top`, landing on the next frame. */
  const scrollTo = async (top: number, byReader: boolean) => {
    scroll(top, byReader);
    await nextFrame();
  };

  return {
    result,
    commits: () => commits,
    update: (options) => act(() => render(options)),
    leaveBottom: () => scrollTo(1_000, true),
    leaveBottomUnseen: () => scroll(1_000, true),
    driftFromBottom: () => scrollTo(1_000, false),
    returnToBottom: () => scrollTo(99_500, true),
    setHidden: (next) => {
      hidden = next;
      act(() => render(latest));
    },
  };
}

const ids = (history: HistoryWindow<Row>) => history.items.map((row) => row.id);
const first = (history: HistoryWindow<Row>) => history.items[0]?.id;

function deferred() {
  let resolve: () => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<void>((settle, fail) => {
    resolve = settle;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe("useHistoryWindow with in-memory history", () => {
  test("starts at the latest windowSize items", () => {
    const { result } = mount({ items: rows(0, 300) });
    expect(result.current.items).toHaveLength(120);
    expect(first(result.current)).toBe("r180");
    expect(result.current.items.at(-1)?.id).toBe("r299");
    expect(result.current.hasEarlier).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  test("reachStart grows the window by step until the first item", () => {
    const { result } = mount({ items: rows(0, 300), step: 80 });
    act(() => result.current.reachStart());
    expect(first(result.current)).toBe("r100");
    act(() => result.current.reachStart());
    expect(first(result.current)).toBe("r20");
    act(() => result.current.reachStart());
    expect(first(result.current)).toBe("r0");
    expect(result.current.items).toHaveLength(300);
    expect(result.current.hasEarlier).toBe(false);
  });

  test("freezes while the reader is scrolled up and trims back at the bottom", async () => {
    const harness = mount({ items: rows(0, 300) });
    const { result } = harness;
    await harness.leaveBottom();

    // New items arrive below: nothing above the reader is removed.
    harness.update({ items: rows(0, 305) });
    expect(first(result.current)).toBe("r180");
    expect(result.current.items).toHaveLength(125);

    act(() => result.current.reachStart());
    expect(first(result.current)).toBe("r120");
    expect(result.current.items).toHaveLength(185);

    await harness.returnToBottom();
    expect(first(result.current)).toBe("r185");
    expect(result.current.items).toHaveLength(120);
  });

  test("only the reader's own scroll freezes the window", async () => {
    const harness = mount({ items: rows(0, 300) });
    // Away and back once, so the conversation no longer follows the end and
    // a layout scroll can leave it.
    await harness.leaveBottom();
    await harness.returnToBottom();
    // Let the reader's gesture, and its momentum allowance, end.
    await act(() => new Promise((resolve) => setTimeout(resolve, 200)));
    await harness.driftFromBottom();
    harness.update({ items: rows(0, 301) });
    expect(first(harness.result.current)).toBe("r181");
    expect(harness.result.current.items).toHaveLength(120);
  });

  test("at the bottom, new items slide the window", () => {
    const harness = mount({ items: rows(0, 300) });
    harness.update({ items: rows(0, 301) });
    expect(first(harness.result.current)).toBe("r181");
    expect(harness.result.current.items).toHaveLength(120);
  });

  test("a window grown at the bottom shrinks with the next item", () => {
    const harness = mount({ items: rows(0, 300) });
    act(() => harness.result.current.reachStart());
    expect(harness.result.current.items).toHaveLength(180);
    harness.update({ items: rows(0, 301) });
    expect(first(harness.result.current)).toBe("r181");
  });

  test("an item that lands before the frame the reader left in removes nothing", async () => {
    const harness = mount({ items: rows(0, 300) });
    const { result } = harness;
    await harness.returnToBottom();
    // A host that commits synchronously within the frame (flushSync in a
    // frame-batched stream) lands its item before the frame's scroll pass.
    harness.leaveBottomUnseen();
    harness.update({ items: rows(0, 301) });
    expect(first(result.current)).toBe("r180");
    expect(result.current.items).toHaveLength(121);

    // The frame then sees the reader's scroll and freezes the window.
    await nextFrame();
    harness.update({ items: rows(0, 302) });
    expect(first(result.current)).toBe("r180");
    expect(result.current.items).toHaveLength(122);
  });

  test("an id swapped at the end as the reader leaves removes nothing", async () => {
    const harness = mount({ items: rows(0, 300) });
    const { result } = harness;
    await harness.returnToBottom();
    harness.leaveBottomUnseen();
    // The last item's id is replaced (an optimistic id swapped for the
    // server's) and a reply appended, in one update.
    const swapped = [...rows(0, 299), { id: "r299-server" }, { id: "r300" }];
    harness.update({ items: swapped });
    expect(first(result.current)).toBe("r180");

    // The frame then sees the reader's scroll and freezes the window there.
    await nextFrame();
    harness.update({ items: [...swapped, { id: "r301" }] });
    expect(first(result.current)).toBe("r180");
  });

  test("an id swapped at the end at the bottom still slides the window", () => {
    const harness = mount({ items: rows(0, 300) });
    const swapped = [...rows(0, 299), { id: "r299-server" }, { id: "r300" }];
    harness.update({ items: swapped });
    expect(first(harness.result.current)).toBe("r181");
    expect(harness.result.current.items).toHaveLength(120);
  });

  test("a removed start item keeps the rest of the window", async () => {
    const harness = mount({ items: rows(0, 300) });
    await harness.leaveBottom();
    harness.update({ items: rows(0, 301) });
    // The pinned start, r180, and the item after it are deleted.
    const items = rows(0, 301).filter(
      (row) => row.id !== "r180" && row.id !== "r181",
    );
    harness.update({ items });
    expect(first(harness.result.current)).toBe("r182");
    expect(harness.result.current.items).toHaveLength(119);
  });
});

describe("useHistoryWindow with server paging", () => {
  test("asks the host only once the local items are all shown", async () => {
    let calls = 0;
    const { result } = mount({
      items: rows(0, 300),
      hasEarlier: true,
      onLoadEarlier: () => {
        calls += 1;
      },
    });
    act(() => result.current.reachStart());
    act(() => result.current.reachStart());
    expect(calls).toBe(0);
    act(() => result.current.reachStart());
    expect(first(result.current)).toBe("r0");
    expect(calls).toBe(0);
    // A loader that returns nothing settles on the next microtask.
    await act(async () => result.current.reachStart());
    expect(calls).toBe(1);
  });

  test("calls onLoadEarlier once until it resolves, then reveals the page a step at a time", async () => {
    let calls = 0;
    let load = deferred();
    let items = rows(250, 300);
    const options = (): UseHistoryWindowOptions<Row> => ({
      items,
      step: 20,
      hasEarlier: true,
      onLoadEarlier: () => {
        calls += 1;
        return load.promise;
      },
    });
    const harness = mount(options());
    const { result } = harness;
    expect(result.current.items).toHaveLength(50);
    expect(result.current.hasEarlier).toBe(true);

    act(() => result.current.reachStart());
    expect(calls).toBe(1);
    expect(result.current.loading).toBe(true);
    act(() => result.current.reachStart());
    act(() => result.current.reachStart());
    expect(calls).toBe(1);

    // The host prepends its page, then its load resolves.
    items = rows(200, 300);
    harness.update(options());
    await act(async () => {
      load.resolve();
      await load.promise;
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.stalled).toBe(false);
    // The page landed above the window, which stays where it was.
    expect(first(result.current)).toBe("r250");
    expect(result.current.hasEarlier).toBe(true);

    act(() => result.current.reachStart());
    expect(first(result.current)).toBe("r230");
    expect(calls).toBe(1);
    act(() => result.current.reachStart());
    act(() => result.current.reachStart());
    expect(first(result.current)).toBe("r200");

    load = deferred();
    act(() => result.current.reachStart());
    expect(calls).toBe(2);
    expect(result.current.loading).toBe(true);
  });

  test("a load that brings nothing stalls until asked again", async () => {
    let calls = 0;
    let load = deferred();
    const harness = mount({
      items: rows(250, 300),
      hasEarlier: true,
      onLoadEarlier: () => {
        calls += 1;
        return load.promise;
      },
    });
    const { result } = harness;
    act(() => result.current.reachStart());
    await act(async () => {
      load.resolve();
      await load.promise;
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.stalled).toBe(true);
    expect(calls).toBe(1);

    // An explicit retry asks again; a rejection stalls the same way.
    load = deferred();
    act(() => result.current.reachStart());
    expect(calls).toBe(2);
    expect(result.current.stalled).toBe(false);
    await act(async () => {
      load.reject(new Error("offline"));
      await load.promise.catch(() => {});
    });
    expect(result.current.loading).toBe(false);
    expect(result.current.stalled).toBe(true);
  });

  test("a stall never blocks items already held above the window", async () => {
    let calls = 0;
    const options: UseHistoryWindowOptions<Row> = {
      items: rows(0, 300),
      hasEarlier: true,
      onLoadEarlier: () => {
        calls += 1;
        return Promise.reject(new Error("offline"));
      },
    };
    const harness = mount(options);
    const { result } = harness;
    act(() => result.current.reachStart());
    act(() => result.current.reachStart());
    act(() => result.current.reachStart());
    expect(first(result.current)).toBe("r0");
    await act(async () => result.current.reachStart());
    expect(calls).toBe(1);
    expect(result.current.stalled).toBe(true);

    // Back at the bottom the window trims, and 180 held items sit above it.
    await harness.leaveBottom();
    await harness.returnToBottom();
    expect(first(result.current)).toBe("r180");
    expect(result.current.hasEarlier).toBe(true);
    expect(result.current.stalled).toBe(false);

    // Revealing them asks nothing of the host; at items[0] the stall is back.
    act(() => result.current.reachStart());
    act(() => result.current.reachStart());
    act(() => result.current.reachStart());
    expect(first(result.current)).toBe("r0");
    expect(calls).toBe(1);
    expect(result.current.stalled).toBe(true);
  });

  test("a loader that throws stalls and reports the error once", async () => {
    const reported: unknown[] = [];
    const original = globalThis.reportError;
    globalThis.reportError = (error: unknown) => {
      reported.push(error);
    };
    try {
      const failure = new Error("offline");
      const { result } = mount({
        items: rows(250, 300),
        hasEarlier: true,
        onLoadEarlier: () => {
          throw failure;
        },
      });
      // Reached from the marker's observer callback: nothing may escape it.
      await act(async () => result.current.reachStart());
      expect(reported).toEqual([failure]);
      expect(result.current.loading).toBe(false);
      expect(result.current.stalled).toBe(true);
    } finally {
      globalThis.reportError = original;
    }
  });

  test("a load that settles while hidden by Activity is not lost", async () => {
    const load = deferred();
    let options: UseHistoryWindowOptions<Row> = {
      items: rows(250, 300),
      hasEarlier: true,
      onLoadEarlier: () => load.promise,
    };
    const harness = mount(options);
    act(() => harness.result.current.reachStart());
    expect(harness.result.current.loading).toBe(true);

    harness.setHidden(true);
    options = { ...options, items: rows(200, 300) };
    harness.update(options);
    await act(async () => {
      load.resolve();
      await load.promise;
    });
    harness.setHidden(false);
    expect(harness.result.current.loading).toBe(false);
    expect(harness.result.current.stalled).toBe(false);
  });

  test("a page that arrives after its load settled clears the stall", async () => {
    const load = deferred();
    const harness = mount({
      items: rows(250, 300),
      hasEarlier: true,
      onLoadEarlier: () => load.promise,
    });
    act(() => harness.result.current.reachStart());
    await act(async () => {
      load.resolve();
      await load.promise;
    });
    expect(harness.result.current.stalled).toBe(true);
    harness.update({
      items: rows(200, 300),
      hasEarlier: true,
      onLoadEarlier: () => load.promise,
    });
    expect(harness.result.current.stalled).toBe(false);
  });
});

describe("useHistoryWindow ceiling", () => {
  test("10,000 items: the window, not the history, sets the work", async () => {
    let items = rows(0, 10_000);
    const harness = mount({ items });
    const { result } = harness;
    expect(result.current.items).toHaveLength(120);

    // An unrelated render reuses the window: no new slice, no new array.
    const before = result.current.items;
    harness.update({ items });
    expect(result.current.items).toBe(before);

    await harness.leaveBottom();
    for (let load = 1; load <= 3; load += 1) {
      const commits = harness.commits();
      act(() => result.current.reachStart());
      expect(harness.commits() - commits).toBe(1);
      expect(result.current.items).toHaveLength(120 + load * 60);
    }

    await harness.returnToBottom();
    expect(result.current.items).toHaveLength(120);
    expect(first(result.current)).toBe("r9880");

    // A long run of new items at the bottom never grows the window.
    for (let count = 1; count <= 50; count += 1) {
      items = rows(0, 10_000 + count);
      harness.update({ items });
      expect(result.current.items).toHaveLength(120);
    }
    expect(ids(result.current).at(-1)).toBe("r10049");
  });
});
