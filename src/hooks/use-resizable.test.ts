import { act, createElement, startTransition, Suspense, use } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import {
  RESIZABLE_WIDTH_VAR,
  useResizable,
  type UseResizableOptions,
} from "./use-resizable.js";

const MIN = 320;
const MAIN_MIN = 440;

// happy-dom does no layout, so the resized element's geometry is emulated
// here the way the panel stylesheet lays it out: the chosen width, or 46% of
// the row between 480 and 760, held between `MIN` and `row - MAIN_MIN`.
let rowWidth = 1400;
const originalRect = HTMLElement.prototype.getBoundingClientRect;
const originalClientWidth = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  "clientWidth",
);

function cssWidth(element: HTMLElement): number {
  const chosen = element.style.getPropertyValue(RESIZABLE_WIDTH_VAR);
  const fallback = Math.min(Math.max(rowWidth * 0.46, 480), 760);
  const wanted = chosen === "" ? fallback : Number.parseFloat(chosen);
  return Math.min(Math.max(wanted, MIN), Math.max(MIN, rowWidth - MAIN_MIN));
}

beforeEach(() => {
  rowWidth = 1400;
  HTMLElement.prototype.getBoundingClientRect = function (
    this: HTMLElement,
  ): DOMRect {
    return this.tagName === "ASIDE"
      ? new DOMRect(0, 0, cssWidth(this), 600)
      : originalRect.call(this);
  };
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get(this: HTMLElement) {
      return this.getAttribute("data-row") === null ? 0 : rowWidth;
    },
  });
});

afterEach(() => {
  HTMLElement.prototype.getBoundingClientRect = originalRect;
  if (originalClientWidth !== undefined) {
    Object.defineProperty(
      HTMLElement.prototype,
      "clientWidth",
      originalClientWidth,
    );
  }
});

type Mounted = {
  readonly panel: HTMLElement;
  readonly handle: HTMLElement;
  readonly changes: (number | null)[];
  press(key: string, init?: KeyboardEventInit): void;
  pointer(type: string, clientX: number): void;
  rerender(options?: Partial<UseResizableOptions>): void;
  unmount(): void;
};

function find(container: HTMLElement, selector: string): HTMLElement {
  const element = container.querySelector(selector);
  if (!(element instanceof HTMLElement)) throw new Error(`no ${selector}`);
  return element;
}

function mount(
  options: Partial<UseResizableOptions> = {},
  dir?: "rtl",
): Mounted {
  const changes: (number | null)[] = [];
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root!: Root;

  function Harness(props: Partial<UseResizableOptions>) {
    const resizable = useResizable({
      minWidth: MIN,
      mainMinWidth: MAIN_MIN,
      onWidthChange: (width) => changes.push(width),
      ...props,
    });
    return createElement(
      "div",
      { "data-row": "" },
      createElement(
        "aside",
        {
          ref: resizable.panelRef,
          // happy-dom does not derive `direction` from a `dir` attribute.
          style: dir === undefined ? undefined : { direction: dir },
        },
        createElement("div", {
          "data-handle": "",
          "aria-label": "Resize",
          ...resizable.handleProps,
        }),
      ),
    );
  }

  const render = (props: Partial<UseResizableOptions>) =>
    act(() => root.render(createElement(Harness, props)));
  act(() => {
    root = createRoot(container);
  });
  render(options);
  const handle = find(container, "[data-handle]");
  // happy-dom has no pointer capture; the hook only needs it not to throw.
  handle.setPointerCapture = () => {};
  handle.releasePointerCapture = () => {};
  handle.hasPointerCapture = () => false;
  return {
    panel: find(container, "aside"),
    handle,
    changes,
    press(key, init = {}) {
      act(() => {
        handle.dispatchEvent(
          new KeyboardEvent("keydown", { key, bubbles: true, ...init }),
        );
      });
    },
    pointer(type, clientX) {
      act(() => {
        handle.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            button: 0,
            isPrimary: true,
            pointerId: 1,
            clientX,
          }),
        );
      });
    },
    rerender(next = options) {
      render(next);
    },
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function shownWidth(mounted: Mounted): number {
  return mounted.panel.getBoundingClientRect().width;
}

describe("useResizable", () => {
  test("starts at the stylesheet default and reports it on the handle", () => {
    const mounted = mount();
    expect(mounted.panel.style.getPropertyValue(RESIZABLE_WIDTH_VAR)).toBe("");
    expect(mounted.handle.getAttribute("aria-valuenow")).toBe("644");
    expect(mounted.handle.getAttribute("aria-valuemin")).toBe(String(MIN));
    expect(mounted.handle.getAttribute("aria-valuemax")).toBe("960");
    mounted.unmount();
  });

  test("arrow keys step from the rendered width, Shift for bigger steps", () => {
    const mounted = mount();
    mounted.press("ArrowLeft");
    expect(mounted.changes).toEqual([660]);
    expect(shownWidth(mounted)).toBe(660);
    expect(mounted.handle.getAttribute("aria-valuenow")).toBe("660");
    mounted.press("ArrowLeft", { shiftKey: true });
    expect(mounted.changes).toEqual([660, 724]);
    mounted.press("ArrowRight");
    expect(mounted.changes).toEqual([660, 724, 708]);
    mounted.unmount();
  });

  test("clamps to the minimum and the maximum", () => {
    const mounted = mount();
    mounted.press("Home");
    expect(mounted.changes).toEqual([MIN]);
    mounted.press("ArrowRight");
    expect(mounted.changes).toEqual([MIN]);
    mounted.press("End");
    expect(mounted.changes).toEqual([MIN, 960]);
    mounted.press("ArrowLeft", { shiftKey: true });
    expect(mounted.changes).toEqual([MIN, 960]);
    expect(shownWidth(mounted)).toBe(960);
    mounted.unmount();
  });

  test("keeps the main area's minimum width", () => {
    rowWidth = 1100;
    const mounted = mount();
    expect(mounted.handle.getAttribute("aria-valuemax")).toBe(
      String(1100 - MAIN_MIN),
    );
    mounted.press("End");
    mounted.press("ArrowLeft");
    expect(mounted.changes).toEqual([1100 - MAIN_MIN]);
    expect(shownWidth(mounted)).toBe(1100 - MAIN_MIN);
    mounted.unmount();
  });

  test("gives way to the minimum when the row cannot hold both", () => {
    rowWidth = 600;
    const mounted = mount({ defaultWidth: 500 });
    expect(shownWidth(mounted)).toBe(MIN);
    expect(mounted.handle.getAttribute("aria-valuemax")).toBe(String(MIN));
    mounted.unmount();
  });

  test("steps from the clamped width, not a stale stored one", () => {
    rowWidth = 1000;
    const mounted = mount({ defaultWidth: 900 });
    expect(shownWidth(mounted)).toBe(560);
    mounted.press("ArrowRight");
    expect(mounted.changes).toEqual([544]);
    mounted.unmount();
  });

  test("Enter and double-click reset to the default", () => {
    const mounted = mount();
    mounted.press("ArrowLeft");
    mounted.press("Enter");
    expect(mounted.changes).toEqual([660, null]);
    expect(mounted.panel.style.getPropertyValue(RESIZABLE_WIDTH_VAR)).toBe("");
    expect(shownWidth(mounted)).toBe(644);

    mounted.press("End");
    act(() => {
      mounted.handle.dispatchEvent(
        new MouseEvent("dblclick", { bubbles: true }),
      );
    });
    expect(mounted.changes).toEqual([660, null, 960, null]);
    expect(shownWidth(mounted)).toBe(644);
    mounted.unmount();
  });

  test("landing back on the default stores no width", () => {
    const mounted = mount();
    mounted.press("ArrowLeft");
    mounted.press("ArrowRight");
    expect(mounted.changes).toEqual([660, null]);
    mounted.unmount();
  });

  test("a controlled parent that ignores a change keeps its width", async () => {
    const mounted = mount({ width: 700 });
    expect(shownWidth(mounted)).toBe(700);
    mounted.press("ArrowLeft");
    expect(mounted.changes).toEqual([716]);
    expect(shownWidth(mounted)).toBe(700);
    mounted.rerender({ width: 716 });
    expect(shownWidth(mounted)).toBe(716);

    mounted.pointer("pointerdown", 500);
    mounted.pointer("pointermove", 400);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(shownWidth(mounted)).toBe(816);
    mounted.pointer("pointerup", 400);
    expect(mounted.changes).toEqual([716, 816]);
    expect(shownWidth(mounted)).toBe(716);
    mounted.unmount();
  });

  test("a render React throws away leaves the committed width in charge", async () => {
    // A transition that suspends renders the hook with the new width, then
    // drops that render and keeps the committed one on screen.
    const never = new Promise<never>(() => {});
    const changes: (number | null)[] = [];
    const container = document.createElement("div");
    document.body.appendChild(container);
    function Suspending({
      width,
      pending,
    }: {
      readonly width: number;
      readonly pending: boolean;
    }) {
      const resizable = useResizable({
        width,
        minWidth: MIN,
        mainMinWidth: MAIN_MIN,
        onWidthChange: (next) => changes.push(next),
      });
      if (pending) use(never);
      return createElement(
        "div",
        { "data-row": "" },
        createElement(
          "aside",
          { ref: resizable.panelRef },
          createElement("div", {
            "data-handle": "",
            "aria-label": "Resize",
            ...resizable.handleProps,
          }),
        ),
      );
    }
    const tree = (width: number, pending: boolean) =>
      createElement(
        Suspense,
        { fallback: null },
        createElement(Suspending, { width, pending }),
      );
    let root!: Root;
    act(() => {
      root = createRoot(container);
      root.render(tree(700, false));
    });
    await act(async () => {
      startTransition(() => root.render(tree(900, true)));
    });
    const panel = find(container, "aside");
    expect(panel.getBoundingClientRect().width).toBe(700);

    // The parent keeps 700, so the element has to stay at 700.
    act(() => {
      find(container, "[data-handle]").dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }),
      );
    });
    expect(changes).toEqual([716]);
    expect(panel.style.getPropertyValue(RESIZABLE_WIDTH_VAR)).toBe("700px");
    act(() => root.unmount());
    container.remove();
  });

  test("ignores keys it does not handle", () => {
    const mounted = mount();
    mounted.press("ArrowUp");
    mounted.press("a");
    expect(mounted.changes).toEqual([]);
    mounted.unmount();
  });

  test("a drag commits once on release, from where the pointer stopped", () => {
    const mounted = mount();
    mounted.pointer("pointerdown", 500);
    mounted.pointer("pointermove", 450);
    mounted.pointer("pointermove", 400);
    expect(mounted.changes).toEqual([]);
    mounted.pointer("pointerup", 400);
    expect(mounted.changes).toEqual([744]);
    mounted.unmount();
  });

  test("a drag cut short without a release puts the committed width back", async () => {
    const mounted = mount({ defaultWidth: 600 });
    mounted.pointer("pointerdown", 500);
    mounted.pointer("pointermove", 400);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(mounted.panel.style.getPropertyValue(RESIZABLE_WIDTH_VAR)).toBe(
      "700px",
    );
    // A new press abandons the drag in flight; it never moves, so it commits
    // nothing either.
    mounted.pointer("pointerdown", 400);
    mounted.pointer("pointerup", 400);
    expect(mounted.changes).toEqual([]);
    expect(mounted.panel.style.getPropertyValue(RESIZABLE_WIDTH_VAR)).toBe(
      "600px",
    );
    mounted.unmount();
  });

  test("a press that never moves past the drag threshold commits nothing", () => {
    // The stored 900 renders clamped to 560: a commit would overwrite it.
    rowWidth = 1000;
    const clamped = mount({ defaultWidth: 900 });
    expect(shownWidth(clamped)).toBe(560);
    clamped.pointer("pointerdown", 500);
    clamped.pointer("pointermove", 498);
    clamped.pointer("pointerup", 498);
    expect(clamped.changes).toEqual([]);
    clamped.unmount();

    // A stored width equal to the default: a commit would reset it.
    rowWidth = 1400;
    const atDefault = mount({ defaultWidth: 644 });
    atDefault.pointer("pointerdown", 500);
    atDefault.pointer("pointerup", 500);
    expect(atDefault.changes).toEqual([]);
    atDefault.unmount();
  });

  test("mirrors keys and drags in right-to-left text", () => {
    const mounted = mount({}, "rtl");
    mounted.press("ArrowRight");
    expect(mounted.changes).toEqual([660]);
    mounted.press("ArrowLeft");
    expect(mounted.changes).toEqual([660, null]);
    mounted.pointer("pointerdown", 500);
    mounted.pointer("pointermove", 600);
    mounted.pointer("pointerup", 600);
    expect(mounted.changes).toEqual([660, null, 744]);
    mounted.unmount();
  });
});
