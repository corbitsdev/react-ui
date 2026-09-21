import { afterEach, describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";

import { ThinkingLabel } from "./thinking-label.js";

type Restore = () => void;

function stubMatchMedia(reducedMotion: boolean): Restore {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) =>
    ({
      matches: reducedMotion && query.includes("prefers-reduced-motion"),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

function stubInterval(): {
  readonly calls: Array<{ fn: () => void; ms: number | undefined }>;
  readonly restore: Restore;
} {
  const originalSet = globalThis.setInterval;
  const originalClear = globalThis.clearInterval;
  const calls: Array<{ fn: () => void; ms: number | undefined }> = [];
  globalThis.setInterval = ((fn: TimerHandler, ms?: number) => {
    calls.push({ fn: fn as () => void, ms });
    return 1 as unknown as ReturnType<typeof setInterval>;
  }) as unknown as typeof setInterval;
  globalThis.clearInterval = (() => {}) as unknown as typeof clearInterval;
  return {
    calls,
    restore: () => {
      globalThis.setInterval = originalSet;
      globalThis.clearInterval = originalClear;
    },
  };
}

function mount(props: { verbs: readonly string[]; intervalMs?: number }) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(ThinkingLabel, props));
  });
  return {
    text: () => container.textContent ?? "",
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("ThinkingLabel", () => {
  const restores: Restore[] = [];
  afterEach(() => {
    while (restores.length > 0) restores.pop()?.();
  });

  test("empty verbs render nothing", () => {
    const html = renderToStaticMarkup(createElement(ThinkingLabel, { verbs: [] }));
    expect(html).toBe("");
  });

  test("reduced motion does not setInterval", () => {
    restores.push(stubMatchMedia(true));
    const interval = stubInterval();
    restores.push(interval.restore);

    const handle = mount({ verbs: ["Reading", "Thinking"] });
    expect(interval.calls).toHaveLength(0);
    expect(handle.text()).toContain("Reading");
    handle.unmount();
  });

  test("rotation advances after intervalMs", () => {
    restores.push(stubMatchMedia(false));
    const interval = stubInterval();
    restores.push(interval.restore);

    const handle = mount({ verbs: ["Reading", "Thinking", "Writing"], intervalMs: 50 });
    expect(interval.calls).toHaveLength(1);
    expect(interval.calls[0]?.ms).toBe(50);
    expect(handle.text()).toContain("Reading");

    act(() => {
      interval.calls[0]?.fn();
    });
    expect(handle.text()).toContain("Thinking");

    act(() => {
      interval.calls[0]?.fn();
    });
    expect(handle.text()).toContain("Writing");

    handle.unmount();
  });
});
