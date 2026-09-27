import { afterEach, beforeEach, expect, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { AnimatedNumber } from "./animated-number.js";

let now = 0;
let frames: FrameRequestCallback[] = [];
const original = {
  now: performance.now.bind(performance),
  raf: globalThis.requestAnimationFrame,
  caf: globalThis.cancelAnimationFrame,
};

beforeEach(() => {
  now = 0;
  frames = [];
  performance.now = () => now;
  globalThis.requestAnimationFrame = (callback) => frames.push(callback);
  globalThis.cancelAnimationFrame = () => {
    frames = [];
  };
});

afterEach(() => {
  performance.now = original.now;
  globalThis.requestAnimationFrame = original.raf;
  globalThis.cancelAnimationFrame = original.caf;
});

function tick(ms: number) {
  now += ms;
  const pending = frames;
  frames = [];
  act(() => pending.forEach((callback) => callback(now)));
}

test("a new value mid-count continues from the displayed number", () => {
  const container = document.createElement("div");
  const root = createRoot(container);
  const shown = () => container.querySelector("[aria-hidden]")?.textContent;

  act(() => root.render(createElement(AnimatedNumber, { value: 0 })));
  act(() => root.render(createElement(AnimatedNumber, { value: 100 })));
  tick(300);
  const midway = Number(shown());
  expect(midway).toBeGreaterThan(0);
  expect(midway).toBeLessThan(100);

  act(() => root.render(createElement(AnimatedNumber, { value: 200 })));
  tick(1);
  expect(Math.abs(Number(shown()) - midway)).toBeLessThan(2);
  tick(600);
  expect(shown()).toBe("200");
  act(() => root.unmount());
});
