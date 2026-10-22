import { act, createElement } from "react";
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
  rerender(options?: Partial<UseResizableOptions>): void;
  unmount(): void;
};

function find(container: HTMLElement, selector: string): HTMLElement {
  const element = container.querySelector(selector);
  if (!(element instanceof HTMLElement)) throw new Error(`no ${selector}`);
  return element;
}

function mount(options: Partial<UseResizableOptions> = {}): Mounted {
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
        { ref: resizable.panelRef },
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

  test("a controlled parent that ignores a change keeps its width", () => {
    const mounted = mount({ width: 700 });
    expect(shownWidth(mounted)).toBe(700);
    mounted.press("ArrowLeft");
    expect(mounted.changes).toEqual([716]);
    expect(shownWidth(mounted)).toBe(700);
    mounted.rerender({ width: 716 });
    expect(shownWidth(mounted)).toBe(716);
    mounted.unmount();
  });

  test("ignores keys it does not handle", () => {
    const mounted = mount();
    mounted.press("ArrowUp");
    mounted.press("a");
    expect(mounted.changes).toEqual([]);
    mounted.unmount();
  });
});
