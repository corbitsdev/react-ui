import { act } from "react";
import { describe, expect, test } from "bun:test";

import { useAnchoredScroll } from "../../src/hooks/use-anchored-scroll.js";
import { renderHook } from "./render-hook.js";

/** happy-dom reports zero for scroll metrics unless a test stubs them. */
function stubScrollMetrics(el: HTMLElement, { scrollHeight, scrollTop, clientHeight }: Record<string, number>) {
  Object.defineProperty(el, "scrollHeight", { configurable: true, value: scrollHeight });
  Object.defineProperty(el, "scrollTop", { configurable: true, value: scrollTop, writable: true });
  Object.defineProperty(el, "clientHeight", { configurable: true, value: clientHeight });
}

describe("useAnchoredScroll", () => {
  test("pins to the bottom on first render", () => {
    const hook = renderHook(() => useAnchoredScroll<HTMLDivElement>(1));
    const el = document.createElement("div");
    stubScrollMetrics(el, { scrollHeight: 500, scrollTop: 0, clientHeight: 200 });
    act(() => {
      hook.result.current.containerRef.current = el;
    });
    expect(hook.result.current.containerRef.current).toBe(el);
    hook.unmount();
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
});
