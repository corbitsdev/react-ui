import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import { useAnchoredScroll } from "../../src/hooks/use-anchored-scroll.js";
import { renderHook } from "./render-hook.js";

/** happy-dom reports zero for scroll metrics unless a test stubs them. */
function stubScrollMetrics(el: HTMLElement, { scrollHeight, scrollTop, clientHeight }: Record<string, number>) {
  Object.defineProperty(el, "scrollHeight", { configurable: true, value: scrollHeight });
  Object.defineProperty(el, "scrollTop", { configurable: true, value: scrollTop, writable: true });
  Object.defineProperty(el, "clientHeight", { configurable: true, value: clientHeight });
}

/**
 * happy-dom's `ResizeObserver` never actually fires — there's no layout
 * engine behind it to detect a real size change. This stub hands the test
 * direct control over the callback the hook registers, so a test can
 * trigger it the same way a real resize would.
 */
function stubResizeObserver(): { fire: () => void; restore: () => void } {
  let callback: (() => void) | undefined;
  class StubResizeObserver {
    constructor(cb: () => void) {
      callback = cb;
    }
    observe() {}
    disconnect() {}
  }
  const original = globalThis.ResizeObserver;
  globalThis.ResizeObserver = StubResizeObserver as unknown as typeof ResizeObserver;
  return {
    fire: () => callback?.(),
    restore: () => {
      globalThis.ResizeObserver = original;
    },
  };
}

/**
 * happy-dom's `scrollHeight`/`clientHeight` getters are real accessors
 * backed by an internal field that always reads 0 — there's no layout
 * engine behind them. Overriding on `Element.prototype` (not per-instance)
 * is what lets a real, freshly-mounted DOM node report non-zero metrics the
 * moment `useAnchoredScroll`'s own mount effect reads them.
 */
function withScrollMetrics<T>(scrollHeight: number, clientHeight: number, fn: () => T): T {
  const scrollHeightDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "scrollHeight");
  const clientHeightDescriptor = Object.getOwnPropertyDescriptor(Element.prototype, "clientHeight");
  Object.defineProperty(Element.prototype, "scrollHeight", { configurable: true, get: () => scrollHeight });
  Object.defineProperty(Element.prototype, "clientHeight", { configurable: true, get: () => clientHeight });
  try {
    return fn();
  } finally {
    if (scrollHeightDescriptor !== undefined) {
      Object.defineProperty(Element.prototype, "scrollHeight", scrollHeightDescriptor);
    }
    if (clientHeightDescriptor !== undefined) {
      Object.defineProperty(Element.prototype, "clientHeight", clientHeightDescriptor);
    }
  }
}

function ScrollHarness({ itemCount }: { itemCount: number }) {
  const { containerRef, contentRef, handleScroll } = useAnchoredScroll<HTMLDivElement>(itemCount);
  return (
    <div ref={containerRef} onScroll={handleScroll}>
      <div ref={contentRef} />
    </div>
  );
}

describe("useAnchoredScroll", () => {
  test("pins to the bottom on first render", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    let root!: Root;

    withScrollMetrics(500, 200, () => {
      act(() => {
        root = createRoot(container);
        root.render(<ScrollHarness itemCount={1} />);
      });
    });

    const scrollEl = container.firstElementChild as HTMLDivElement;
    expect(scrollEl.scrollTop).toBe(500);

    act(() => root.unmount());
    container.remove();
  });

  test("scrolls to the bottom when itemCount grows while pinned", () => {
    let count = 1;
    const hook = renderHook(() => useAnchoredScroll<HTMLDivElement>(count));
    const el = document.createElement("div");
    stubScrollMetrics(el, { scrollHeight: 500, scrollTop: 300, clientHeight: 200 });
    hook.result.current.containerRef.current = el;

    count = 2;
    stubScrollMetrics(el, { scrollHeight: 700, scrollTop: 300, clientHeight: 200 });
    act(() => hook.rerender());

    expect(el.scrollTop).toBe(700);
    hook.unmount();
  });

  test("does not move scrollTop when the reader has scrolled away from the bottom", () => {
    let count = 1;
    const hook = renderHook(() => useAnchoredScroll<HTMLDivElement>(count));
    const el = document.createElement("div");
    hook.result.current.containerRef.current = el;

    // Reader scrolled up: 300px from the bottom, well past the pin threshold.
    stubScrollMetrics(el, { scrollHeight: 900, scrollTop: 100, clientHeight: 200 });
    act(() => hook.result.current.handleScroll());

    count = 2;
    stubScrollMetrics(el, { scrollHeight: 1100, scrollTop: 100, clientHeight: 200 });
    act(() => hook.rerender());

    expect(el.scrollTop).toBe(100);
    hook.unmount();
  });

  test("re-pins once the reader scrolls back within the bottom threshold", () => {
    let count = 1;
    const hook = renderHook(() => useAnchoredScroll<HTMLDivElement>(count));
    const el = document.createElement("div");
    hook.result.current.containerRef.current = el;

    stubScrollMetrics(el, { scrollHeight: 900, scrollTop: 100, clientHeight: 200 });
    act(() => hook.result.current.handleScroll());

    // Reader scrolls back down, within the 40px pin threshold.
    stubScrollMetrics(el, { scrollHeight: 900, scrollTop: 690, clientHeight: 200 });
    act(() => hook.result.current.handleScroll());

    count = 2;
    stubScrollMetrics(el, { scrollHeight: 1100, scrollTop: 690, clientHeight: 200 });
    act(() => hook.rerender());

    expect(el.scrollTop).toBe(1100);
    hook.unmount();
  });

  test("re-pins on in-place content growth while itemCount stays constant", () => {
    const resizeObserver = stubResizeObserver();
    try {
      const hook = renderHook(() => useAnchoredScroll<HTMLDivElement>(1));
      const container = document.createElement("div");
      const content = document.createElement("div");
      hook.result.current.containerRef.current = container;
      stubScrollMetrics(container, { scrollHeight: 500, scrollTop: 300, clientHeight: 200 });

      act(() => hook.result.current.contentRef(content));

      // The content element grows taller in place (streaming text, a
      // growing tool-output block) — itemCount never changes, only
      // scrollHeight does.
      stubScrollMetrics(container, { scrollHeight: 900, scrollTop: 300, clientHeight: 200 });
      act(() => resizeObserver.fire());

      expect(container.scrollTop).toBe(900);
      hook.unmount();
    } finally {
      resizeObserver.restore();
    }
  });

  test("does not re-pin on in-place content growth once the reader has scrolled away", () => {
    const resizeObserver = stubResizeObserver();
    try {
      const hook = renderHook(() => useAnchoredScroll<HTMLDivElement>(1));
      const container = document.createElement("div");
      const content = document.createElement("div");
      hook.result.current.containerRef.current = container;

      stubScrollMetrics(container, { scrollHeight: 900, scrollTop: 100, clientHeight: 200 });
      act(() => hook.result.current.handleScroll());

      act(() => hook.result.current.contentRef(content));

      stubScrollMetrics(container, { scrollHeight: 1200, scrollTop: 100, clientHeight: 200 });
      act(() => resizeObserver.fire());

      expect(container.scrollTop).toBe(100);
      hook.unmount();
    } finally {
      resizeObserver.restore();
    }
  });
});
