import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { usePrefersReducedMotion } from "./use-prefers-reduced-motion.js";

type Listener = (event: { matches: boolean }) => void;

function stubMatchMedia(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<Listener>();
  const original = window.matchMedia;

  window.matchMedia = ((query: string) =>
    ({
      matches,
      media: query,
      addEventListener: (_type: string, listener: Listener) => listeners.add(listener),
      removeEventListener: (_type: string, listener: Listener) => listeners.delete(listener),
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

function mount() {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let result: boolean | undefined;

  function Host() {
    result = usePrefersReducedMotion();
    return null;
  }

  act(() => {
    root.render(createElement(Host));
  });

  return {
    get: () => result as boolean,
    unmount: () => act(() => root.unmount()),
  };
}

describe("usePrefersReducedMotion", () => {
  test("reads the initial preference", () => {
    const media = stubMatchMedia(true);
    const handle = mount();
    expect(handle.get()).toBe(true);
    handle.unmount();
    media.restore();
  });

  test("defaults to false when the preference is unset", () => {
    const media = stubMatchMedia(false);
    const handle = mount();
    expect(handle.get()).toBe(false);
    handle.unmount();
    media.restore();
  });

  test("updates live when the OS preference changes", () => {
    const media = stubMatchMedia(false);
    const handle = mount();
    expect(handle.get()).toBe(false);
    act(() => media.set(true));
    expect(handle.get()).toBe(true);
    handle.unmount();
    media.restore();
  });
});
