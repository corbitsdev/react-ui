import { beforeEach, describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { useResizableRail, type ResizableRail } from "./use-resizable-rail.js";

const OPTIONS = { storageKey: "test-rail", defaultWidth: 300, minWidth: 200, maxWidth: 500 } as const;

async function mount(options: Parameters<typeof useResizableRail>[0] = OPTIONS) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  let result: ResizableRail | undefined;

  function Host() {
    result = useResizableRail(options);
    return null;
  }

  act(() => {
    root.render(createElement(Host));
  });
  // The hook's mount effect re-clamps against the container on a microtask
  // after commit; flush it before reading state.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  return {
    get: () => result as ResizableRail,
    unmount: () => act(() => root.unmount()),
  };
}

describe("useResizableRail", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test("starts at defaultWidth when nothing is stored", async () => {
    const handle = await mount();
    expect(handle.get().width).toBe(300);
    expect(handle.get().dragging).toBe(false);
    handle.unmount();
  });

  test("double-click resets to defaultWidth after a drag moved it", async () => {
    const handle = await mount();
    act(() => {
      handle.get().handleProps.onKeyDown({
        key: "ArrowRight",
        preventDefault: () => {},
      } as unknown as Parameters<ResizableRail["handleProps"]["onKeyDown"]>[0]);
    });
    expect(handle.get().width).toBe(324);
    act(() => {
      handle.get().handleProps.onDoubleClick();
    });
    expect(handle.get().width).toBe(300);
    handle.unmount();
  });

  test("ArrowLeft/ArrowRight nudge the width by the keyboard step and clamp at the bounds", async () => {
    const handle = await mount({ ...OPTIONS, defaultWidth: 200 });
    const fire = (key: string) =>
      act(() => {
        handle.get().handleProps.onKeyDown({ key, preventDefault: () => {} } as unknown as Parameters<
          ResizableRail["handleProps"]["onKeyDown"]
        >[0]);
      });
    fire("ArrowLeft");
    expect(handle.get().width).toBe(200); // clamped at minWidth
    fire("ArrowRight");
    fire("ArrowRight");
    expect(handle.get().width).toBe(248);
    handle.unmount();
  });

  test("persists width to localStorage and a later mount reads it back", async () => {
    const first = await mount();
    act(() => {
      first.get().handleProps.onKeyDown({
        key: "ArrowRight",
        preventDefault: () => {},
      } as unknown as Parameters<ResizableRail["handleProps"]["onKeyDown"]>[0]);
    });
    expect(window.localStorage.getItem("test-rail")).toBe("324");
    first.unmount();

    const second = await mount();
    expect(second.get().width).toBe(324);
    second.unmount();
  });
});
