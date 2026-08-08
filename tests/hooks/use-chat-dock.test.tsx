import { act } from "react";
import { describe, expect, test } from "bun:test";

import { useChatDock } from "../../src/hooks/use-chat-dock.js";
import { renderHook } from "./render-hook.js";

function pressEscape(): void {
  act(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
  });
}

describe("useChatDock", () => {
  test("open moves closed -> docked", () => {
    const hook = renderHook(() => useChatDock());
    act(() => hook.result.current.open());
    expect(hook.result.current.mode).toBe("docked");
  });

  test("expand moves docked -> fullpage, collapse moves back", () => {
    const hook = renderHook(() => useChatDock("docked"));
    act(() => hook.result.current.expand());
    expect(hook.result.current.mode).toBe("fullpage");
    act(() => hook.result.current.collapse());
    expect(hook.result.current.mode).toBe("docked");
  });

  test("close moves any open mode back to closed", () => {
    const hook = renderHook(() => useChatDock("fullpage"));
    act(() => hook.result.current.close());
    expect(hook.result.current.mode).toBe("closed");
  });

  test("open is a no-op once already open", () => {
    const hook = renderHook(() => useChatDock("fullpage"));
    act(() => hook.result.current.open());
    expect(hook.result.current.mode).toBe("fullpage");
  });

  test("collapse is a no-op while already closed", () => {
    const hook = renderHook(() => useChatDock("closed"));
    act(() => hook.result.current.collapse());
    expect(hook.result.current.mode).toBe("closed");
  });

  test("Escape steps fullpage -> docked, not straight to closed", () => {
    const hook = renderHook(() => useChatDock("fullpage"));
    pressEscape();
    expect(hook.result.current.mode).toBe("docked");
  });

  test("Escape closes directly from docked", () => {
    const hook = renderHook(() => useChatDock("docked"));
    pressEscape();
    expect(hook.result.current.mode).toBe("closed");
  });

  test("Escape does nothing while closed", () => {
    const hook = renderHook(() => useChatDock("closed"));
    pressEscape();
    expect(hook.result.current.mode).toBe("closed");
  });

  test("shouldAnimateEntrance is true only when the previous mode was closed", () => {
    const hook = renderHook(() => useChatDock());
    expect(hook.result.current.shouldAnimateEntrance).toBe(false);

    act(() => hook.result.current.open());
    expect(hook.result.current.mode).toBe("docked");
    expect(hook.result.current.shouldAnimateEntrance).toBe(true);

    act(() => hook.result.current.expand());
    expect(hook.result.current.mode).toBe("fullpage");
    expect(hook.result.current.shouldAnimateEntrance).toBe(false);

    act(() => hook.result.current.collapse());
    expect(hook.result.current.mode).toBe("docked");
    expect(hook.result.current.shouldAnimateEntrance).toBe(false);
  });
});
