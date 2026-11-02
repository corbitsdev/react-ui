import { act, createRef, StrictMode, useState } from "react";
import type { ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  Conversation,
  ConversationContent,
  ConversationItem,
} from "./conversation.js";
import {
  ConversationMap,
  type ConversationMapTurn,
} from "./conversation-map.js";

/** happy-dom never intersects anything: a fake the tests drive by hand. */
class FakeIntersectionObserver {
  static live = new Set<FakeIntersectionObserver>();
  static created = 0;
  readonly targets = new Set<Element>();
  readonly root: Element | Document | null;

  constructor(
    private readonly callback: IntersectionObserverCallback,
    options: IntersectionObserverInit = {},
  ) {
    this.root = options.root ?? null;
    FakeIntersectionObserver.created += 1;
    FakeIntersectionObserver.live.add(this);
  }

  observe(target: Element) {
    this.targets.add(target);
  }

  unobserve(target: Element) {
    this.targets.delete(target);
  }

  disconnect() {
    this.targets.clear();
    FakeIntersectionObserver.live.delete(this);
  }

  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }

  /** Reports every observed target, intersecting when its item id is listed. */
  report(visible: readonly string[]) {
    const entries = [...this.targets].map((target) => {
      const id = target.getAttribute("data-item-id") ?? "";
      // Only the two fields the hook reads; the rest of an entry is geometry
      // happy-dom cannot produce.
      return {
        target,
        isIntersecting: visible.includes(id),
      } as unknown as IntersectionObserverEntry;
    });
    this.callback(entries, this as unknown as IntersectionObserver);
  }
}

const original = globalThis.IntersectionObserver;

beforeEach(() => {
  FakeIntersectionObserver.live.clear();
  FakeIntersectionObserver.created = 0;
  // A stand-in with the members the hook calls.
  globalThis.IntersectionObserver =
    FakeIntersectionObserver as unknown as typeof IntersectionObserver;
});

afterEach(() => {
  globalThis.IntersectionObserver = original;
});

function onlyObserver(): FakeIntersectionObserver {
  const [observer, ...rest] = FakeIntersectionObserver.live;
  if (observer === undefined || rest.length > 0) {
    throw new Error(`expected one observer, found ${rest.length + 1}`);
  }
  return observer;
}

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
    rerender: (node) => act(() => root.render(node)),
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

const TURNS: readonly ConversationMapTurn[] = [
  { id: "q1", label: "First question", preview: "First answer" },
  { id: "q2", label: "Second question", preview: "Second answer" },
  { id: "q3", label: "Third question" },
  { id: "q4", label: "Fourth question", preview: "Fourth answer" },
];

const ITEMS = TURNS.flatMap((turn) => [turn.id, `${turn.id}-reply`]);

function Chat({
  turns = TURNS,
  items = ITEMS,
  onSelect,
  contentKey = "content",
  showContent = true,
}: {
  turns?: readonly ConversationMapTurn[];
  items?: readonly string[];
  onSelect?: (id: string) => void;
  contentKey?: string;
  showContent?: boolean;
}) {
  return (
    <Conversation>
      <ConversationMap turns={turns} onSelect={onSelect} />
      {showContent ? (
        <ConversationContent key={contentKey}>
          {items.map((id) => (
            <ConversationItem key={id} itemId={id}>
              {id}
            </ConversationItem>
          ))}
        </ConversationContent>
      ) : null}
    </Conversation>
  );
}

function tick(container: HTMLElement, name: string): HTMLButtonElement {
  const found = [
    ...container.querySelectorAll<HTMLButtonElement>(
      "[data-slot='conversation-map-tick']",
    ),
  ].find((button) => button.getAttribute("aria-label") === name);
  if (found === undefined) throw new Error(`no tick named ${name}`);
  return found;
}

function states(container: HTMLElement) {
  return [
    ...container.querySelectorAll<HTMLButtonElement>(
      "[data-slot='conversation-map-tick']",
    ),
  ].map((button) =>
    button.getAttribute("aria-current") === "location"
      ? "current"
      : button.hasAttribute("data-visible")
        ? "on screen"
        : "faint",
  );
}

function scroller(container: HTMLElement): HTMLElement {
  const element = container.querySelector<HTMLElement>(
    "[data-slot='conversation-content']",
  );
  if (element === null) throw new Error("expected the scroll container");
  return element;
}

/** The reader scrolling the view to `top`, just after a wheel event on it. */
function readerScroll(element: HTMLElement, top: number) {
  act(() => {
    Object.defineProperty(element, "scrollHeight", {
      configurable: true,
      value: 10_000,
    });
    Object.defineProperty(element, "clientHeight", {
      configurable: true,
      value: 600,
    });
    element.scrollTop = top;
    element.dispatchEvent(new Event("scroll"));
  });
}

/** Puts an element at `top` (happy-dom does no layout). */
function placeAt(element: Element, top: number, height = 40) {
  Object.defineProperty(element, "getBoundingClientRect", {
    configurable: true,
    value: () => new DOMRect(0, top, 400, height),
  });
}

const sleep = (ms: number) =>
  act(() => new Promise((resolve) => setTimeout(resolve, ms)));

/** A 600px view over 10_000px at `scrollTop`, with `q1` at 1_000 in scroll
 * coordinates, so a jump to it glides for real. */
function layOutFarFromQ1(container: HTMLElement, scrollTop: number) {
  const log = scroller(container);
  Object.defineProperty(log, "scrollHeight", {
    configurable: true,
    value: 10_000,
  });
  Object.defineProperty(log, "clientHeight", {
    configurable: true,
    value: 600,
  });
  placeAt(log, 0, 600);
  log.scrollTop = scrollTop;
  const q1 = log.querySelector("[data-item-id='q1']");
  if (q1 === null) throw new Error("expected q1");
  Object.defineProperty(q1, "getBoundingClientRect", {
    configurable: true,
    value: () => new DOMRect(0, 1_000 - log.scrollTop, 400, 40),
  });
  return log;
}

describe("ConversationMap", () => {
  test("renders one tick per turn, named by what was said", () => {
    const mounted = render(<Chat />);
    const nav = mounted.container.querySelector("nav");
    expect(nav?.getAttribute("aria-label")).toBe("Conversation map");
    expect(
      [
        ...mounted.container.querySelectorAll(
          "[data-slot='conversation-map-tick']",
        ),
      ].map((button) => button.getAttribute("aria-label")),
    ).toEqual(TURNS.map((turn) => turn.label));
    mounted.unmount();
  });

  test("forwards its ref to the nav", () => {
    const ref = createRef<HTMLElement>();
    const mounted = render(
      <Conversation>
        <ConversationMap ref={ref} turns={TURNS} />
        <ConversationContent />
      </Conversation>,
    );
    expect(
      mounted.container.querySelector<HTMLElement>(
        "[data-slot='conversation-map']",
      ),
    ).toBe(ref.current);
    expect(ref.current).not.toBeNull();
    mounted.unmount();
  });

  test("renders nothing for fewer than two turns", () => {
    const mounted = render(<Chat turns={TURNS.slice(0, 1)} />);
    expect(mounted.container.querySelector("nav")).toBeNull();
    mounted.unmount();
  });

  test("ticks are faint, on screen or current from the turns in view", async () => {
    const mounted = render(<Chat />);
    await nextFrame();
    expect(states(mounted.container)).toEqual([
      "faint",
      "faint",
      "faint",
      "faint",
    ]);

    // At the end of the content, the last turn on screen is current.
    act(() => onlyObserver().report(["q2-reply", "q3", "q3-reply"]));
    await nextFrame();
    expect(states(mounted.container)).toEqual([
      "faint",
      "on screen",
      "current",
      "faint",
    ]);
    mounted.unmount();
  });

  test("away from the end, the turn crossing the reading line is current", async () => {
    const mounted = render(<Chat />);
    const element = scroller(mounted.container);
    Object.defineProperty(element, "scrollHeight", { value: 10_000 });
    Object.defineProperty(element, "clientHeight", { value: 600 });
    placeAt(element, 0, 600);
    element.dispatchEvent(new WheelEvent("wheel"));
    element.scrollTop = 1_000;
    element.dispatchEvent(new Event("scroll"));
    for (const item of element.querySelectorAll("[data-item-id]")) {
      const id = item.getAttribute("data-item-id");
      placeAt(item, id === "q2" ? -50 : id === "q3" ? 300 : 900);
    }

    act(() => onlyObserver().report(["q2", "q2-reply", "q3"]));
    await nextFrame();
    await nextFrame();
    // The line sits at 200: q2 started above it, q3 below.
    expect(states(mounted.container)).toEqual([
      "faint",
      "current",
      "on screen",
      "faint",
    ]);
    mounted.unmount();
  });

  test("clicking a tick makes it current until the reader scrolls", async () => {
    const selected: string[] = [];
    const mounted = render(<Chat onSelect={(id) => selected.push(id)} />);
    act(() => onlyObserver().report(["q3", "q3-reply", "q4", "q4-reply"]));
    await nextFrame();
    expect(states(mounted.container)).toEqual([
      "faint",
      "faint",
      "on screen",
      "current",
    ]);

    act(() => tick(mounted.container, "Third question").click());
    await nextFrame();
    expect(selected).toEqual(["q3"]);
    expect(states(mounted.container)).toEqual([
      "faint",
      "faint",
      "current",
      "on screen",
    ]);

    act(() => {
      scroller(mounted.container).dispatchEvent(new WheelEvent("wheel"));
    });
    readerScroll(scroller(mounted.container), 1_000);
    await nextFrame();
    expect(states(mounted.container)[3]).toBe("current");
    mounted.unmount();
  });

  test("clicking or typing inside an item keeps the jumped turn current", async () => {
    const mounted = render(
      <Conversation>
        <ConversationMap turns={TURNS} />
        <ConversationContent>
          {ITEMS.map((id) => (
            <ConversationItem key={id} itemId={id}>
              <p>{id}</p>
              <input aria-label={`Reply to ${id}`} />
            </ConversationItem>
          ))}
        </ConversationContent>
      </Conversation>,
    );
    const log = scroller(mounted.container);
    act(() => onlyObserver().report(["q3", "q3-reply", "q4", "q4-reply"]));
    await nextFrame();
    act(() => tick(mounted.container, "Third question").click());
    await nextFrame();
    expect(states(mounted.container)[2]).toBe("current");

    const text = log.querySelector<HTMLElement>("[data-item-id='q3'] p");
    const field = log.querySelector<HTMLInputElement>(
      "[data-item-id='q3'] input",
    );
    if (text === null || field === null) throw new Error("expected q3");
    act(() => {
      text.dispatchEvent(new Event("pointerdown", { bubbles: true }));
      text.click();
      field.focus();
      field.dispatchEvent(
        new KeyboardEvent("keydown", { key: "a", bubbles: true }),
      );
    });
    // The layout moving the view is not the reader scrolling it either.
    act(() => {
      Object.defineProperty(log, "scrollHeight", {
        configurable: true,
        value: 10_000,
      });
      Object.defineProperty(log, "clientHeight", {
        configurable: true,
        value: 600,
      });
      log.scrollTop = 500;
      log.dispatchEvent(new Event("scroll"));
    });
    await nextFrame();
    await nextFrame();
    expect(states(mounted.container)[2]).toBe("current");

    act(() => log.dispatchEvent(new WheelEvent("wheel")));
    readerScroll(log, 1_000);
    await nextFrame();
    expect(states(mounted.container)).toEqual([
      "faint",
      "faint",
      "on screen",
      "current",
    ]);
    mounted.unmount();
  });

  test("the rail is one tab stop, and the arrow keys move along it", async () => {
    const mounted = render(<Chat />);
    act(() => onlyObserver().report(["q2", "q2-reply"]));
    await nextFrame();
    const tabStops = () =>
      [
        ...mounted.container.querySelectorAll<HTMLButtonElement>(
          "[data-slot='conversation-map-tick']",
        ),
      ]
        .filter((button) => button.tabIndex === 0)
        .map((button) => button.getAttribute("aria-label"));
    expect(tabStops()).toEqual(["Second question"]);

    const press = (key: string) =>
      act(() => {
        document.activeElement?.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true }),
        );
      });
    act(() => tick(mounted.container, "Second question").focus());
    press("ArrowDown");
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Third question",
    );
    expect(tabStops()).toEqual(["Third question"]);
    press("End");
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Fourth question",
    );
    press("ArrowDown");
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Fourth question",
    );
    press("Home");
    press("ArrowUp");
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "First question",
    );
    mounted.unmount();
  });

  test("focusing a tick previews its turn; Escape dismisses it", () => {
    const mounted = render(<Chat />);
    const second = tick(mounted.container, "Second question");
    act(() => second.focus());
    const card = mounted.container.querySelector("[role='tooltip']");
    expect(card?.textContent).toBe("Second questionSecond answer");
    const described = second.getAttribute("aria-describedby");
    expect(described).not.toBeNull();
    expect(
      described === null
        ? null
        : document.getElementById(described)?.textContent,
    ).toBe("Second answer");

    act(() => {
      second.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(mounted.container.querySelector("[role='tooltip']")).toBeNull();
    expect(second.hasAttribute("aria-describedby")).toBe(false);
    mounted.unmount();
  });

  test("Escape dismisses a preview the mouse opened while focus is elsewhere", () => {
    const mounted = render(<Chat />);
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    act(() => {
      tick(mounted.container, "Second question").dispatchEvent(
        new PointerEvent("pointerover", {
          bubbles: true,
          pointerType: "mouse",
        }),
      );
    });
    expect(
      mounted.container.querySelector("[role='tooltip']")?.textContent,
    ).toBe("Second questionSecond answer");

    act(() => {
      input.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(mounted.container.querySelector("[role='tooltip']")).toBeNull();
    expect(document.activeElement).toBe(input);
    input.remove();
    mounted.unmount();
  });

  test("a focused tick whose turn goes keeps focus on the rail", () => {
    const mounted = render(<Chat />);
    act(() => tick(mounted.container, "First question").focus());
    const rest = TURNS.slice(1);
    mounted.rerender(
      <Chat turns={rest} items={ITEMS.filter((id) => !id.startsWith("q1"))} />,
    );
    expect(document.activeElement?.getAttribute("aria-label")).toBe(
      "Second question",
    );
    mounted.unmount();
  });

  test("a focused tick whose rail goes hands focus to the log", () => {
    const mounted = render(<Chat />);
    act(() => tick(mounted.container, "First question").focus());
    mounted.rerender(<Chat turns={TURNS.slice(3)} items={["q4"]} />);
    expect(
      mounted.container.querySelector("[data-slot='conversation-map']"),
    ).toBeNull();
    expect(document.activeElement).toBe(scroller(mounted.container));
    mounted.unmount();
  });

  test("a focused tick whose rail goes with its turn kept hands focus to the log", () => {
    const mounted = render(<Chat />);
    act(() => tick(mounted.container, "Fourth question").focus());
    mounted.rerender(<Chat turns={TURNS.slice(3)} items={["q4"]} />);
    expect(
      mounted.container.querySelector("[data-slot='conversation-map']"),
    ).toBeNull();
    expect(document.activeElement).toBe(scroller(mounted.container));
    mounted.unmount();
  });

  test("scrolling the rail measures the previewed tick in the handler, not in render", () => {
    const mounted = render(
      <StrictMode>
        <Chat />
      </StrictMode>,
    );
    const second = tick(mounted.container, "Second question");
    act(() => second.focus());
    let reads = 0;
    Object.defineProperty(second, "getBoundingClientRect", {
      configurable: true,
      value: () => {
        reads += 1;
        return new DOMRect(0, 40, 24, 14);
      },
    });
    const rail = mounted.container.querySelector(
      "[data-slot='conversation-map-rail']",
    );
    placeAt(rail ?? document.body, 0, 600);
    act(() => {
      rail?.dispatchEvent(new Event("scroll"));
    });
    // One measurement reads the tick twice. StrictMode runs a state updater
    // twice, so a measurement made in one would read it four times.
    expect(reads).toBe(2);
    expect(
      mounted.container.querySelector("[role='tooltip']")?.textContent,
    ).toBe("Second questionSecond answer");
    mounted.unmount();
  });
});

describe("useReadingPosition", () => {
  test("one observer, rooted on the scroll container, watches every item", () => {
    const mounted = render(<Chat />);
    const observer = onlyObserver();
    expect(observer.root).toBe(scroller(mounted.container));
    expect(observer.targets.size).toBe(ITEMS.length);
    mounted.unmount();
    expect(FakeIntersectionObserver.live.size).toBe(0);
  });

  test("a host's own data-slot on the content does not hide the container", async () => {
    const mounted = render(
      <Conversation>
        <ConversationMap turns={TURNS} />
        <ConversationContent data-slot="chat-log">
          {ITEMS.map((id) => (
            <ConversationItem key={id} itemId={id}>
              {id}
            </ConversationItem>
          ))}
        </ConversationContent>
      </Conversation>,
    );
    const log = mounted.container.querySelector("[role='log']");
    expect(log?.getAttribute("data-slot")).toBe("chat-log");
    const observer = onlyObserver();
    expect(observer.root).toBe(log);
    expect(observer.targets.size).toBe(ITEMS.length);

    act(() => observer.report(["q2", "q2-reply"]));
    await nextFrame();
    expect(states(mounted.container)).toEqual([
      "faint",
      "current",
      "faint",
      "faint",
    ]);
    mounted.unmount();
  });

  test("under StrictMode one observer stays live and teardown is clean", () => {
    const mounted = render(
      <StrictMode>
        <Chat />
      </StrictMode>,
    );
    expect(onlyObserver().targets.size).toBe(ITEMS.length);
    mounted.unmount();
    expect(FakeIntersectionObserver.live.size).toBe(0);
  });

  test("items added or removed later are observed or dropped", async () => {
    let setItems!: (items: readonly string[]) => void;
    function Growing() {
      const [items, set] = useState<readonly string[]>(ITEMS.slice(0, 4));
      setItems = set;
      return <Chat items={items} />;
    }
    const mounted = render(<Growing />);
    expect(onlyObserver().targets.size).toBe(4);
    act(() => setItems(ITEMS));
    await act(() => Promise.resolve());
    expect(onlyObserver().targets.size).toBe(ITEMS.length);
    act(() => setItems(ITEMS.slice(2)));
    await act(() => Promise.resolve());
    expect(onlyObserver().targets.size).toBe(ITEMS.length - 2);
    mounted.unmount();
  });

  test("a remounted ConversationContent gets a new observer on its log", async () => {
    let setKey!: (key: string) => void;
    function Host() {
      const [key, set] = useState("a");
      setKey = set;
      return <Chat contentKey={key} />;
    }
    const mounted = render(<Host />);
    const first = onlyObserver();
    act(() => setKey("b"));
    await nextFrame();
    const second = onlyObserver();
    expect(second).not.toBe(first);
    expect(second.root).toBe(scroller(mounted.container));
    expect(second.targets.size).toBe(ITEMS.length);

    act(() => second.report(["q3", "q3-reply"]));
    await nextFrame();
    expect(states(mounted.container)).toContain("current");
    mounted.unmount();
    expect(FakeIntersectionObserver.live.size).toBe(0);
  });

  test("removing ConversationContent disconnects; restoring observes again", async () => {
    let setShow!: (show: boolean) => void;
    function Host() {
      const [show, set] = useState(true);
      setShow = set;
      return <Chat showContent={show} />;
    }
    const mounted = render(<Host />);
    onlyObserver();
    act(() => setShow(false));
    await nextFrame();
    expect(FakeIntersectionObserver.live.size).toBe(0);
    act(() => setShow(true));
    await nextFrame();
    expect(onlyObserver().targets.size).toBe(ITEMS.length);
    mounted.unmount();
  });

  test("every listener added to the log is removed on unmount", () => {
    const added = new Map<string, number>();
    const removed = new Map<string, number>();
    const bump = (counts: Map<string, number>, type: string) =>
      counts.set(type, (counts.get(type) ?? 0) + 1);
    const prototype = HTMLElement.prototype;
    const { addEventListener, removeEventListener } = prototype;
    prototype.addEventListener = function (
      this: HTMLElement,
      ...args: Parameters<HTMLElement["addEventListener"]>
    ) {
      if (this.getAttribute("role") === "log") bump(added, args[0]);
      addEventListener.apply(this, args);
    };
    prototype.removeEventListener = function (
      this: HTMLElement,
      ...args: Parameters<HTMLElement["removeEventListener"]>
    ) {
      if (this.getAttribute("role") === "log") bump(removed, args[0]);
      removeEventListener.apply(this, args);
    };
    try {
      render(<Chat />).unmount();
    } finally {
      prototype.addEventListener = addEventListener;
      prototype.removeEventListener = removeEventListener;
    }
    for (const type of ["wheel", "touchstart", "keydown", "pointerdown"]) {
      expect(added.get(type) ?? 0).toBeGreaterThan(0);
    }
    expect(removed).toEqual(added);
  });

  test("a jump not yet seen ends when ConversationContent goes away", async () => {
    let setShow!: (show: boolean) => void;
    function Host() {
      const [show, set] = useState(true);
      setShow = set;
      return <Chat showContent={show} />;
    }
    const mounted = render(<Host />);
    act(() => onlyObserver().report(["q4", "q4-reply"]));
    await nextFrame();
    act(() => tick(mounted.container, "First question").click());
    await nextFrame();
    expect(states(mounted.container)[0]).toBe("current");
    // Gone before the glide brought q1 on screen, then back showing q4.
    act(() => setShow(false));
    await nextFrame();
    act(() => setShow(true));
    await nextFrame();
    act(() => onlyObserver().report(["q4", "q4-reply"]));
    await nextFrame();
    expect(states(mounted.container)[0]).toBe("faint");
    expect(states(mounted.container)[3]).toBe("current");
    mounted.unmount();
  });

  test("a jump not yet seen ends when its turn is removed", async () => {
    let setItems!: (items: readonly string[]) => void;
    function Host() {
      const [items, set] = useState<readonly string[]>(ITEMS);
      setItems = set;
      return <Chat items={items} />;
    }
    const mounted = render(<Host />);
    act(() => onlyObserver().report(["q4", "q4-reply"]));
    await nextFrame();
    act(() => tick(mounted.container, "First question").click());
    await nextFrame();
    expect(states(mounted.container)[0]).toBe("current");
    act(() => setItems(ITEMS.filter((id) => !id.startsWith("q1"))));
    await nextFrame();
    expect(states(mounted.container)[0]).toBe("faint");
    expect(states(mounted.container)[3]).toBe("current");
    mounted.unmount();
  });

  /** Jumps to q1 from far below it, after `before`, and runs `interrupt`
   * mid-glide. */
  async function jumpCutShort(
    interrupt: (log: HTMLElement) => void,
    before: (log: HTMLElement) => void = () => {},
  ) {
    const mounted = render(<Chat />);
    const log = layOutFarFromQ1(mounted.container, 5_000);
    act(() => onlyObserver().report(["q4", "q4-reply"]));
    await nextFrame();
    act(() => before(log));
    await nextFrame();
    act(() => tick(mounted.container, "First question").click());
    await nextFrame();
    await nextFrame();
    expect(states(mounted.container)[0]).toBe("current");
    act(() => interrupt(log));
    const stoppedAt = log.scrollTop;
    await sleep(900);
    expect(log.scrollTop).toBe(stoppedAt);
    expect(stoppedAt).toBeGreaterThan(1_500);
    act(() => onlyObserver().report(["q3-reply", "q4"]));
    await nextFrame();
    return mounted;
  }

  test("a jump cut short by momentum before q1 is seen ends", async () => {
    const mounted = await jumpCutShort(
      (log) => {
        // A momentum frame: no input of its own.
        log.scrollTop += 60;
        log.dispatchEvent(new Event("scroll"));
      },
      (log) => {
        // A flick, lifted just before the click.
        log.dispatchEvent(new Event("touchstart"));
        log.dispatchEvent(new Event("touchmove"));
        log.scrollTop = 5_100;
        log.dispatchEvent(new Event("scroll"));
        log.dispatchEvent(new Event("touchend"));
      },
    );
    expect(states(mounted.container)[0]).toBe("faint");
    expect(states(mounted.container)[3]).toBe("current");
    mounted.unmount();
  });

  test("a jump stopped by a wheel that moves nothing ends", async () => {
    const mounted = await jumpCutShort((log) => {
      log.dispatchEvent(new WheelEvent("wheel"));
    });
    expect(states(mounted.container)[0]).toBe("faint");
    expect(states(mounted.container)[3]).toBe("current");
    mounted.unmount();
  });

  test("a jump stopped by a tap on a message ends", async () => {
    const mounted = await jumpCutShort((log) => {
      const q4 = log.querySelector("[data-item-id='q4']");
      q4?.dispatchEvent(new Event("touchstart", { bubbles: true }));
      q4?.dispatchEvent(new Event("touchend", { bubbles: true }));
    });
    expect(states(mounted.container)[0]).toBe("faint");
    expect(states(mounted.container)[3]).toBe("current");
    mounted.unmount();
  });

  test("clicking the same tick mid-glide keeps the jump", async () => {
    const mounted = render(<Chat />);
    const log = layOutFarFromQ1(mounted.container, 5_000);
    act(() => onlyObserver().report(["q4", "q4-reply"]));
    await nextFrame();
    act(() => tick(mounted.container, "First question").click());
    await nextFrame();
    await nextFrame();
    // The second click replaces the glide in flight with its own.
    act(() => tick(mounted.container, "First question").click());
    await nextFrame();
    expect(states(mounted.container)[0]).toBe("current");
    await sleep(900);
    expect(log.scrollTop).toBe(1_000);
    expect(states(mounted.container)[0]).toBe("current");
    mounted.unmount();
  });

  test("a jump left alone lands on its turn and keeps it current", async () => {
    const mounted = render(<Chat />);
    const log = layOutFarFromQ1(mounted.container, 5_000);
    act(() => onlyObserver().report(["q4", "q4-reply"]));
    await nextFrame();
    act(() => tick(mounted.container, "First question").click());
    await sleep(900);
    expect(log.scrollTop).toBe(1_000);
    act(() => onlyObserver().report(["q1", "q1-reply"]));
    await nextFrame();
    expect(states(mounted.container)[0]).toBe("current");
    mounted.unmount();
  });

  test("a jumped turn stays current until seen, then until it leaves", async () => {
    const mounted = render(<Chat />);
    act(() => onlyObserver().report(["q4", "q4-reply"]));
    await nextFrame();
    act(() => tick(mounted.container, "First question").click());
    await nextFrame();
    expect(states(mounted.container)[0]).toBe("current");
    // The glide has not reached it yet.
    act(() => onlyObserver().report(["q3-reply", "q4"]));
    await nextFrame();
    expect(states(mounted.container)[0]).toBe("current");
    act(() => onlyObserver().report(["q1", "q1-reply"]));
    await nextFrame();
    expect(states(mounted.container)[0]).toBe("current");
    act(() => onlyObserver().report(["q2", "q2-reply"]));
    await nextFrame();
    expect(states(mounted.container)[0]).toBe("faint");
    mounted.unmount();
  });
});
