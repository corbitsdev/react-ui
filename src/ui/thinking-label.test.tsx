import { afterEach, describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";

import { ThinkingLabel } from "./thinking-label.js";

type Restore = () => void;
type Listener = (event: { matches: boolean }) => void;

function stubMatchMedia(initialReducedMotion: boolean): {
  restore: Restore;
  set: (value: boolean) => void;
} {
  let matches = initialReducedMotion;
  const listeners = new Set<Listener>();
  const original = window.matchMedia;
  window.matchMedia = ((query: string) =>
    ({
      get matches() {
        return matches && query.includes("prefers-reduced-motion");
      },
      media: query,
      addEventListener: (_type: string, listener: Listener) =>
        listeners.add(listener),
      removeEventListener: (_type: string, listener: Listener) =>
        listeners.delete(listener),
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  return {
    set: (value: boolean) => {
      matches = value;
      for (const listener of listeners) listener({ matches: value });
    },
    restore: () => {
      window.matchMedia = original;
    },
  };
}

function stubInterval(): {
  readonly calls: Array<{ fn: () => void; ms: number | undefined }>;
  readonly clears: number;
  readonly restore: Restore;
} {
  const originalSet = globalThis.setInterval;
  const originalClear = globalThis.clearInterval;
  const calls: Array<{ fn: () => void; ms: number | undefined }> = [];
  const state = { clears: 0 };
  globalThis.setInterval = ((fn: TimerHandler, ms?: number) => {
    calls.push({ fn: fn as () => void, ms });
    return 1 as unknown as ReturnType<typeof setInterval>;
  }) as unknown as typeof setInterval;
  globalThis.clearInterval = (() => {
    state.clears += 1;
  }) as unknown as typeof clearInterval;
  return {
    calls,
    get clears() {
      return state.clears;
    },
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
    container,
    // Every verb stays mounted in the stacked grid — the visible one is the
    // cell carrying opacity-100.
    visible: () =>
      container.querySelector("[aria-hidden] .opacity-100")?.textContent ?? "",
    text: () => container.textContent ?? "",
    status: () => container.querySelector('[role="status"]'),
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
    const html = renderToStaticMarkup(
      createElement(ThinkingLabel, { verbs: [] }),
    );
    expect(html).toBe("");
  });

  test("reduced motion does not setInterval", () => {
    restores.push(stubMatchMedia(true).restore);
    const interval = stubInterval();
    restores.push(interval.restore);

    const handle = mount({ verbs: ["Reading", "Thinking"] });
    expect(interval.calls).toHaveLength(0);
    expect(handle.visible()).toBe("Reading");
    handle.unmount();
  });

  test("turning reduced motion on live stops the interval", () => {
    const media = stubMatchMedia(false);
    restores.push(media.restore);
    const interval = stubInterval();
    restores.push(interval.restore);

    const handle = mount({ verbs: ["Reading", "Thinking"] });
    expect(interval.calls).toHaveLength(1);

    act(() => {
      interval.calls[0]?.fn();
    });
    expect(handle.visible()).toBe("Thinking");

    act(() => media.set(true));
    expect(interval.clears).toBeGreaterThan(0);
    expect(handle.visible()).toBe("Reading");

    handle.unmount();
  });

  test("rotation advances after intervalMs", () => {
    restores.push(stubMatchMedia(false).restore);
    const interval = stubInterval();
    restores.push(interval.restore);

    const handle = mount({
      verbs: ["Reading", "Thinking", "Writing"],
      intervalMs: 50,
    });
    expect(interval.calls).toHaveLength(1);
    expect(interval.calls[0]?.ms).toBe(50);
    expect(handle.visible()).toBe("Reading");

    act(() => {
      interval.calls[0]?.fn();
    });
    expect(handle.visible()).toBe("Thinking");

    act(() => {
      interval.calls[0]?.fn();
    });
    expect(handle.visible()).toBe("Writing");

    handle.unmount();
  });

  test("status announces Working once and does not live-announce verb ticks", () => {
    restores.push(stubMatchMedia(false).restore);
    const interval = stubInterval();
    restores.push(interval.restore);

    const handle = mount({ verbs: ["Reading", "Thinking"], intervalMs: 50 });
    expect(handle.status()?.textContent).toBe("Working");
    expect(handle.status()?.getAttribute("aria-live")).toBeNull();
    expect(handle.container.querySelector("[aria-live]")).toBeNull();

    act(() => {
      interval.calls[0]?.fn();
    });
    expect(handle.status()?.textContent).toBe("Working");
    expect(handle.visible()).toBe("Thinking");

    handle.unmount();
  });
});
