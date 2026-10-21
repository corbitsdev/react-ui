import { act } from "react";
import { describe, expect, test } from "bun:test";

import { renderHook } from "../test/render-hook.js";
import {
  useMediaViewer,
  type UseMediaViewerOptions,
} from "./use-media-viewer.js";

const ITEMS = ["a", "b", "c"] as const;

function viewer(options: Partial<UseMediaViewerOptions<string>> = {}) {
  return renderHook(() => useMediaViewer<string>({ items: ITEMS, ...options }));
}

describe("useMediaViewer", () => {
  test("starts closed and opens an item", () => {
    const hook = viewer();
    expect(hook.result.current.index).toBe(null);
    expect(hook.result.current.item).toBe(null);
    act(() => hook.result.current.open(1));
    expect(hook.result.current.index).toBe(1);
    expect(hook.result.current.item).toBe("b");
    hook.unmount();
  });

  test("next and previous stop at the ends", () => {
    const hook = viewer({ defaultIndex: 1 });
    act(() => hook.result.current.next());
    expect(hook.result.current.index).toBe(2);
    expect(hook.result.current.hasNext).toBe(false);
    act(() => hook.result.current.next());
    expect(hook.result.current.index).toBe(2);

    act(() => hook.result.current.previous());
    act(() => hook.result.current.previous());
    expect(hook.result.current.index).toBe(0);
    expect(hook.result.current.hasPrevious).toBe(false);
    act(() => hook.result.current.previous());
    expect(hook.result.current.index).toBe(0);
    expect(hook.result.current.hasNext).toBe(true);
    hook.unmount();
  });

  test("closing clears the open item", () => {
    const hook = viewer({ defaultIndex: 2 });
    act(() => hook.result.current.close());
    expect(hook.result.current.index).toBe(null);
    expect(hook.result.current.item).toBe(null);
    expect(hook.result.current.hasNext).toBe(false);
    expect(hook.result.current.hasPrevious).toBe(false);
    // Stepping does nothing while closed.
    act(() => hook.result.current.next());
    expect(hook.result.current.index).toBe(null);
    hook.unmount();
  });

  test("an index outside the items reads as closed, and open ignores one", () => {
    const hook = viewer({ defaultIndex: 5 });
    expect(hook.result.current.index).toBe(null);
    act(() => hook.result.current.open(3));
    expect(hook.result.current.index).toBe(null);
    act(() => hook.result.current.open(-1));
    expect(hook.result.current.index).toBe(null);
    hook.unmount();
  });

  test("controlled, it reports changes and follows the value it is given", () => {
    const changes: (number | null)[] = [];
    const hook = viewer({
      index: 0,
      onIndexChange: (index) => changes.push(index),
    });
    act(() => hook.result.current.next());
    act(() => hook.result.current.close());
    expect(changes).toEqual([1, null]);
    expect(hook.result.current.index).toBe(0);
    hook.unmount();
  });

  test("keeps the element that opened it", () => {
    const hook = viewer();
    const button = document.createElement("button");
    act(() => hook.result.current.open(0, button));
    expect(hook.result.current.opener.current).toBe(button);
    act(() => hook.result.current.open(1));
    expect(hook.result.current.opener.current).toBe(null);
    hook.unmount();
  });
});
