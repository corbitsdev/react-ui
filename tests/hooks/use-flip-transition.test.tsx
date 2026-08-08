import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import { useFlipTransition, type UseFlipTransitionOptions } from "../../src/hooks/use-flip-transition.js";

type Rect = Pick<DOMRect, "top" | "left" | "width" | "height">;

function rect({ top, left, width, height }: Rect): DOMRect {
  return {
    top,
    left,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  } as DOMRect;
}

/**
 * Stubs `getBoundingClientRect` on `element` to return the next value from
 * `queue` on each call (repeating the last value once exhausted), and counts
 * calls so tests can assert on read ordering, not just the final math.
 */
function stubRects(element: HTMLElement, queue: readonly Rect[]): { calls: number } {
  const state = { calls: 0 };
  let index = 0;
  element.getBoundingClientRect = () => {
    const value = queue[Math.min(index, queue.length - 1)] ?? queue[0];
    index += 1;
    state.calls += 1;
    if (!value) throw new Error("stubRects requires at least one rect");
    return rect(value);
  };
  return state;
}

type Harness = {
  element: HTMLDivElement;
  setKey: (key: string | null) => void;
  unmount: () => void;
};

/**
 * Mounts a single element driven by `useFlipTransition`. `initialRect`, when
 * given, is installed on the element the instant its ref is attached — i.e.
 * before the hook's layout effect runs on the mounting commit — so the very
 * first effect run captures it as the "First" rect for the *next* key
 * change, without needing a wasted extra render to seed it.
 */
function mount(initialKey: string | null, options?: UseFlipTransitionOptions, initialRect?: Rect): Harness {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root!: Root;
  let setKeyState!: (key: string | null) => void;
  let element!: HTMLDivElement;

  function Harness() {
    const [key, setKey] = useState<string | null>(initialKey);
    setKeyState = setKey;
    const ref = useFlipTransition<HTMLDivElement>(key, options);
    return (
      <div
        ref={(node) => {
          ref.current = node;
          if (node && !element) {
            element = node;
            if (initialRect) stubRects(node, [initialRect]);
          }
        }}
      />
    );
  }

  act(() => {
    root = createRoot(container);
    root.render(<Harness />);
  });

  return {
    element,
    setKey: (key) => act(() => setKeyState(key)),
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

describe("useFlipTransition", () => {
  test("does nothing on the first render — nothing to invert against yet", () => {
    const harness = mount("a");
    expect(harness.element.style.transform).toBe("");
    expect(harness.element.style.transition).toBe("");
    harness.unmount();
  });

  test("skips the morph when key goes from null to a value", () => {
    const harness = mount(null, undefined, { top: 0, left: 0, width: 10, height: 10 });
    harness.setKey("a");
    expect(harness.element.style.transform).toBe("");
    harness.unmount();
  });

  test("skips the morph when key goes to null (exit already has its own animation)", () => {
    const harness = mount("a", undefined, { top: 0, left: 0, width: 10, height: 10 });
    harness.setKey(null);
    expect(harness.element.style.transform).toBe("");
    harness.unmount();
  });

  test("skips the morph when the key is unchanged", () => {
    const harness = mount("a", undefined, { top: 0, left: 0, width: 100, height: 100 });
    const rectStub = stubRects(harness.element, [{ top: 0, left: 0, width: 100, height: 100 }]);
    // Same primitive key value: React bails out of the render entirely, so
    // the effect never re-runs and no extra read happens.
    harness.setKey("a");
    expect(rectStub.calls).toBe(0);
    expect(harness.element.style.transform).toBe("");
    harness.unmount();
  });

  test("performs exactly First, then the forced-layout read, then arms Play's transition — in that order", () => {
    const harness = mount("docked", undefined, { top: 100, left: 200, width: 50, height: 40 });

    const writesAtRead: Array<{ transition: string; transform: string }> = [];
    let call = 0;
    const rects: Rect[] = [
      { top: 10, left: 20, width: 200, height: 160 }, // Last: read at the top of the morph
      { top: 10, left: 20, width: 200, height: 160 }, // the forced-reflow read
      { top: 10, left: 20, width: 200, height: 160 }, // tail capture for the next morph
    ];
    harness.element.getBoundingClientRect = () => {
      writesAtRead.push({
        transition: harness.element.style.transition,
        transform: harness.element.style.transform,
      });
      const value = rects[Math.min(call, rects.length - 1)] ?? rects[0];
      call += 1;
      if (!value) throw new Error("rects requires at least one entry");
      return rect(value);
    };

    harness.setKey("fullpage");

    expect(writesAtRead.length).toBe(3);
    // First (Last-rect) read: happens before any style has been touched.
    expect(writesAtRead[0]).toEqual({ transition: "", transform: "" });
    // Invert: the forced-reflow read happens after the inverted transform is
    // written but before Play arms the real transition — that ordering is
    // exactly what makes the transition actually animate instead of
    // coalescing straight to its resting state.
    expect(writesAtRead[1]?.transition).toBe("none");
    expect(writesAtRead[1]?.transform).not.toBe("");
    expect(writesAtRead[1]?.transform).toContain("translate(");
    expect(writesAtRead[1]?.transform).toContain("scale(");
    // Play: the transition is armed and the transform cleared back to
    // identity so it animates there.
    expect(harness.element.style.transition).toBe("transform 280ms var(--ease-out)");
    expect(harness.element.style.transform).toBe("");

    harness.unmount();
  });

  test("computes the inverse transform from the First/Last rect diff", () => {
    // First: x100,y50, 50x40. Last: x20,y10, 200x160.
    const harness = mount("docked", undefined, { top: 50, left: 100, width: 50, height: 40 });

    let capturedTransform = "";
    let readCount = 0;
    harness.element.getBoundingClientRect = () => {
      readCount += 1;
      if (readCount === 2) {
        // The forced-reflow read: the inverted transform has just been
        // written and is the value under test.
        capturedTransform = harness.element.style.transform;
      }
      return rect({ top: 10, left: 20, width: 200, height: 160 });
    };

    harness.setKey("fullpage");

    // deltaX = First.left - Last.left = 100 - 20 = 80
    // deltaY = First.top - Last.top = 50 - 10 = 40
    // scaleX = First.width / Last.width = 50 / 200 = 0.25
    // scaleY = First.height / Last.height = 40 / 160 = 0.25
    expect(capturedTransform).toBe("translate(80px, 40px) scale(0.25, 0.25)");

    harness.unmount();
  });

  test("respects a custom duration and easing", () => {
    const harness = mount("a", { durationMs: 500, easing: "ease-in-out" }, { top: 0, left: 0, width: 10, height: 10 });
    harness.element.getBoundingClientRect = () => rect({ top: 0, left: 0, width: 20, height: 20 });

    harness.setKey("b");

    expect(harness.element.style.transition).toBe("transform 500ms ease-in-out");
    harness.unmount();
  });
});
