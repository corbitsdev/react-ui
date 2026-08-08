import { act } from "react";
import { describe, expect, test } from "bun:test";

import { useRenderRail } from "../../src/hooks/use-render-rail.js";
import type { GenerativeBlock } from "../../src/lib/generative-block.js";
import { renderHook } from "./render-hook.js";

function block(id: string): GenerativeBlock {
  return { type: "callout", id, title: id, body: id };
}

describe("useRenderRail", () => {
  test("shows the latest block when nothing is pinned", () => {
    const hook = renderHook(() => useRenderRail([block("a"), block("b")]));
    expect(hook.result.current.activeBlock?.id).toBe("b");
    expect(hook.result.current.isPinned).toBe(false);
  });

  test("a pinned block takes precedence over latest", () => {
    const hook = renderHook(() => useRenderRail([block("a"), block("b")]));
    act(() => hook.result.current.pin("a"));
    expect(hook.result.current.activeBlock?.id).toBe("a");
    expect(hook.result.current.isPinned).toBe(true);
  });

  test("togglePin unpins when the same id is pinned again", () => {
    const hook = renderHook(() => useRenderRail([block("a"), block("b")]));
    act(() => hook.result.current.togglePin("a"));
    expect(hook.result.current.isPinned).toBe(true);
    act(() => hook.result.current.togglePin("a"));
    expect(hook.result.current.isPinned).toBe(false);
    expect(hook.result.current.activeBlock?.id).toBe("b");
  });

  test("a new block while pinned does not change the active block, but flips hasNewerBlock", () => {
    let blocks: readonly GenerativeBlock[] = [block("a"), block("b")];
    const hook = renderHook(() => useRenderRail(blocks));

    act(() => hook.result.current.pin("a"));
    expect(hook.result.current.hasNewerBlock).toBe(false);

    blocks = [...blocks, block("c")];
    hook.rerender();

    expect(hook.result.current.activeBlock?.id).toBe("a");
    expect(hook.result.current.hasNewerBlock).toBe(true);
  });

  test("jumpToLatest clears the pin and the newer-block signal", () => {
    let blocks: readonly GenerativeBlock[] = [block("a"), block("b")];
    const hook = renderHook(() => useRenderRail(blocks));

    act(() => hook.result.current.pin("a"));
    blocks = [...blocks, block("c")];
    hook.rerender();
    expect(hook.result.current.hasNewerBlock).toBe(true);

    act(() => hook.result.current.jumpToLatest());
    expect(hook.result.current.isPinned).toBe(false);
    expect(hook.result.current.hasNewerBlock).toBe(false);
    expect(hook.result.current.activeBlock?.id).toBe("c");
  });

  test("a new block while nothing is pinned never raises hasNewerBlock", () => {
    let blocks: readonly GenerativeBlock[] = [block("a")];
    const hook = renderHook(() => useRenderRail(blocks));

    blocks = [...blocks, block("b")];
    hook.rerender();

    expect(hook.result.current.hasNewerBlock).toBe(false);
    expect(hook.result.current.activeBlock?.id).toBe("b");
  });
});
