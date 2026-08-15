import { beforeEach, describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { useViewMode } from "./use-view-mode.js";
import type { ViewMode } from "../ui/view-toggle.js";

function mount(storageKey: string, defaultMode?: ViewMode) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let result: { mode: ViewMode; setMode: (mode: ViewMode) => void } | undefined;

  function Host() {
    result = useViewMode(storageKey, defaultMode);
    return null;
  }

  act(() => {
    root.render(createElement(Host));
  });

  return {
    get: () => result as { mode: ViewMode; setMode: (mode: ViewMode) => void },
    rerender: () => {
      act(() => {
        root.render(createElement(Host));
      });
    },
    unmount: () => act(() => root.unmount()),
  };
}

describe("useViewMode", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("defaults to grid when nothing is stored", () => {
    const handle = mount("test-view-mode-a");
    expect(handle.get().mode).toBe("grid");
    handle.unmount();
  });

  test("honors an explicit default", () => {
    const handle = mount("test-view-mode-b", "rows");
    expect(handle.get().mode).toBe("rows");
    handle.unmount();
  });

  test("setMode updates state and persists to localStorage", () => {
    const handle = mount("test-view-mode-c");
    act(() => {
      handle.get().setMode("rows");
    });
    expect(handle.get().mode).toBe("rows");
    expect(window.localStorage.getItem("test-view-mode-c")).toBe("rows");
    handle.unmount();
  });

  test("a later mount reads the persisted mode back", () => {
    const first = mount("test-view-mode-d");
    act(() => {
      first.get().setMode("rows");
    });
    first.unmount();

    const second = mount("test-view-mode-d");
    expect(second.get().mode).toBe("rows");
    second.unmount();
  });

  test("distinct storage keys keep independent preferences", () => {
    const a = mount("test-view-mode-e");
    const b = mount("test-view-mode-f");
    act(() => {
      a.get().setMode("rows");
    });
    expect(a.get().mode).toBe("rows");
    expect(b.get().mode).toBe("grid");
    a.unmount();
    b.unmount();
  });
});
