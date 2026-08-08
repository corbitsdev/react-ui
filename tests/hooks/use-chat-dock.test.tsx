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

  test("Escape already handled by nested UI (defaultPrevented) does not step the dock down", () => {
    const hook = renderHook(() => useChatDock("fullpage"));
    act(() => {
      const event = new KeyboardEvent("keydown", { key: "Escape", cancelable: true, bubbles: true });
      event.preventDefault();
      window.dispatchEvent(event);
    });
    expect(hook.result.current.mode).toBe("fullpage");
  });

  test("Escape originating inside a nested overlay (e.g. a native select) does not step the dock down", () => {
    const dockContainer = document.createElement("div");
    dockContainer.dataset.slot = "chat-dock";
    document.body.appendChild(dockContainer);
    const select = document.createElement("select");
    dockContainer.appendChild(select);

    const hook = renderHook(() => useChatDock("fullpage"));
    act(() => {
      select.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }));
    });
    expect(hook.result.current.mode).toBe("fullpage");

    dockContainer.remove();
  });

  test("Escape originating inside a portal-rendered overlay (role=dialog) does not step the dock down, even outside the dock's DOM subtree", () => {
    const dockContainer = document.createElement("div");
    dockContainer.dataset.slot = "chat-dock";
    document.body.appendChild(dockContainer);

    const portalOverlay = document.createElement("div");
    portalOverlay.setAttribute("role", "dialog");
    document.body.appendChild(portalOverlay);

    const hook = renderHook(() => useChatDock("fullpage"));
    act(() => {
      portalOverlay.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }));
    });
    expect(hook.result.current.mode).toBe("fullpage");

    dockContainer.remove();
    portalOverlay.remove();
  });

  test("Escape from within the dock's own container (no nested overlay) still steps the dock down", () => {
    const dockContainer = document.createElement("div");
    dockContainer.dataset.slot = "chat-dock";
    document.body.appendChild(dockContainer);
    const button = document.createElement("button");
    dockContainer.appendChild(button);

    const hook = renderHook(() => useChatDock("fullpage"));
    act(() => {
      button.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, composed: true }));
    });
    expect(hook.result.current.mode).toBe("docked");

    dockContainer.remove();
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
