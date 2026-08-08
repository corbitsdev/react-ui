import { describe, expect, test } from "bun:test";
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";

import { useCommandPaletteNavigation } from "./use-command-palette-navigation.js";

type Item = { readonly id: string };

/**
 * Mounts the hook inside a bare host so real keydown events can be dispatched
 * against a DOM node, exercising the same path a consumer's keyboard listener
 * takes rather than calling the hook's handler function directly.
 */
function mountNavigation(items: readonly Item[], onSelect: (id: string) => void, onClose: () => void) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let activeId: string | undefined;

  function Host() {
    const nav = useCommandPaletteNavigation({ items, onSelect, onClose });
    activeId = nav.activeId;
    return createElement("div", { tabIndex: 0, onKeyDown: nav.onKeyDown, "data-testid": "host" });
  }

  act(() => {
    root.render(createElement(Host));
  });

  const host = container.querySelector("[data-testid='host']") as HTMLElement;

  return {
    fire(key: string) {
      act(() => {
        host.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
      });
    },
    getActiveId: () => activeId,
    unmount: () => root.unmount(),
  };
}

describe("useCommandPaletteNavigation", () => {
  test("defaults to the first item", () => {
    const nav = mountNavigation([{ id: "a" }, { id: "b" }], () => {}, () => {});
    expect(nav.getActiveId()).toBe("a");
  });

  test("ArrowDown moves selection forward and wraps at the end", () => {
    const nav = mountNavigation([{ id: "a" }, { id: "b" }, { id: "c" }], () => {}, () => {});
    nav.fire("ArrowDown");
    expect(nav.getActiveId()).toBe("b");
    nav.fire("ArrowDown");
    nav.fire("ArrowDown");
    expect(nav.getActiveId()).toBe("a");
  });

  test("ArrowUp moves selection backward and wraps at the start", () => {
    const nav = mountNavigation([{ id: "a" }, { id: "b" }, { id: "c" }], () => {}, () => {});
    nav.fire("ArrowUp");
    expect(nav.getActiveId()).toBe("c");
  });

  test("Enter activates the selected item", () => {
    const selected: string[] = [];
    const nav = mountNavigation(
      [{ id: "a" }, { id: "b" }],
      (id) => selected.push(id),
      () => {},
    );
    nav.fire("ArrowDown");
    nav.fire("Enter");
    expect(selected).toEqual(["b"]);
  });

  test("Escape closes without selecting", () => {
    const selected: string[] = [];
    let closed = false;
    const nav = mountNavigation(
      [{ id: "a" }],
      (id) => selected.push(id),
      () => {
        closed = true;
      },
    );
    nav.fire("Escape");
    expect(closed).toBe(true);
    expect(selected).toEqual([]);
  });

  test("an empty item list has no active id and ignores Enter", () => {
    const selected: string[] = [];
    const nav = mountNavigation([], (id) => selected.push(id), () => {});
    expect(nav.getActiveId()).toBeUndefined();
    nav.fire("Enter");
    expect(selected).toEqual([]);
  });

  test("selection clamps back onto the list when it shrinks", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    let activeId: string | undefined;
    let setItems: (items: readonly Item[]) => void = () => {};

    function Host() {
      const [items, setState] = useState<readonly Item[]>([{ id: "a" }, { id: "b" }, { id: "c" }]);
      setItems = setState;
      const nav = useCommandPaletteNavigation({ items, onSelect: () => {}, onClose: () => {} });
      activeId = nav.activeId;
      return createElement("div", { tabIndex: 0, onKeyDown: nav.onKeyDown, "data-testid": "host" });
    }

    act(() => {
      root.render(createElement(Host));
    });
    const host = container.querySelector("[data-testid='host']") as HTMLElement;
    act(() => {
      host.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    });
    act(() => {
      host.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true, cancelable: true }));
    });
    expect(activeId).toBe("c");

    act(() => {
      setItems([{ id: "a" }]);
    });
    expect(activeId).toBe("a");
    root.unmount();
  });
});
