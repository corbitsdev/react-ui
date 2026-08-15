import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { DitherBackground } from "../../src/ui/dither-background.js";

type Mounted = {
  container: HTMLElement;
  unmount: () => void;
};

function render(node: React.ReactElement): Mounted {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root!: Root;
  act(() => {
    root = createRoot(container);
    root.render(node);
  });
  return {
    container,
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function fakeContext() {
  return {
    clearRect: () => {},
    drawImage: () => {},
    fillRect: () => {},
    createImageData: (width: number, height: number) => ({ data: new Uint8ClampedArray(width * height * 4) }),
    getImageData: (_x: number, _y: number, width: number, height: number) => ({
      data: new Uint8ClampedArray(width * height * 4),
    }),
    putImageData: () => {},
  };
}

class FakeImage {
  naturalWidth = 10;
  naturalHeight = 10;
  onload: (() => void) | null = null;
  private currentSrc = "";
  set src(value: string) {
    this.currentSrc = value;
    if (value !== "") this.onload?.();
  }
  get src() {
    return this.currentSrc;
  }
}

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }
  observe() {}
  unobserve() {}
  disconnect() {}
}

function setHidden(value: boolean) {
  Object.defineProperty(document, "hidden", { value, configurable: true });
}

let originalGetContext: typeof HTMLCanvasElement.prototype.getContext;
let originalImage: typeof Image;
let originalIntersectionObserver: typeof IntersectionObserver;
let originalRAF: typeof requestAnimationFrame;
let originalCAF: typeof cancelAnimationFrame;
let pendingFrames: Map<number, FrameRequestCallback>;
let nextFrameId: number;

beforeEach(() => {
  originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function fakeGetContext(this: HTMLCanvasElement, type: string) {
    if (type === "2d") return fakeContext() as unknown as CanvasRenderingContext2D;
    return null;
  } as typeof HTMLCanvasElement.prototype.getContext;

  originalImage = globalThis.Image;
  globalThis.Image = FakeImage as unknown as typeof Image;

  originalIntersectionObserver = globalThis.IntersectionObserver;
  FakeIntersectionObserver.instances = [];
  globalThis.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;

  originalRAF = globalThis.requestAnimationFrame;
  originalCAF = globalThis.cancelAnimationFrame;
  pendingFrames = new Map();
  nextFrameId = 1;
  globalThis.requestAnimationFrame = ((callback: FrameRequestCallback) => {
    const id = nextFrameId;
    nextFrameId += 1;
    pendingFrames.set(id, callback);
    return id;
  }) as typeof requestAnimationFrame;
  globalThis.cancelAnimationFrame = ((id: number) => {
    pendingFrames.delete(id);
  }) as typeof cancelAnimationFrame;

  setHidden(false);
});

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  globalThis.Image = originalImage;
  globalThis.IntersectionObserver = originalIntersectionObserver;
  globalThis.requestAnimationFrame = originalRAF;
  globalThis.cancelAnimationFrame = originalCAF;
  setHidden(false);
});

describe("DitherBackground", () => {
  test("is aria-hidden unconditionally", () => {
    const mounted = render(<DitherBackground src="https://picsum.photos/seed/dither/800/600" />);
    const canvas = mounted.container.querySelector("canvas");
    expect(canvas?.getAttribute("aria-hidden")).toBe("true");
    mounted.unmount();
  });

  test("reduced motion skips the animation loop and reacts to a live change event", () => {
    let reduce = true;
    let changeListener: (() => void) | null = null;
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      get matches() {
        return query.includes("reduce") ? reduce : false;
      },
      media: query,
      addEventListener: (_type: string, listener: () => void) => {
        changeListener = listener;
      },
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia;

    const mounted = render(<DitherBackground src="https://picsum.photos/seed/dither/800/600" />);

    // The image "loaded" synchronously (FakeImage), rendered one static frame,
    // and must not have scheduled an animation loop while reduced motion holds.
    expect(pendingFrames.size).toBe(0);

    reduce = false;
    act(() => {
      changeListener?.();
    });
    expect(pendingFrames.size).toBe(1);

    window.matchMedia = originalMatchMedia;
    mounted.unmount();
  });

  test("pauses the loop when the tab becomes hidden and resumes when visible again", () => {
    const mounted = render(<DitherBackground src="https://picsum.photos/seed/dither/800/600" />);
    expect(pendingFrames.size).toBe(1);

    act(() => {
      setHidden(true);
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(pendingFrames.size).toBe(0);

    act(() => {
      setHidden(false);
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(pendingFrames.size).toBe(1);

    mounted.unmount();
  });

  test("skips the pointermove listener entirely when warp is disabled", () => {
    const addSpy = window.addEventListener.bind(window) as typeof window.addEventListener;
    const calls: string[] = [];
    window.addEventListener = ((type: string, ...rest: unknown[]) => {
      calls.push(type);
      return (addSpy as (...args: unknown[]) => void)(type, ...rest);
    }) as typeof window.addEventListener;

    const mounted = render(<DitherBackground src="https://picsum.photos/seed/dither/800/600" warp={false} />);
    expect(calls).not.toContain("pointermove");

    window.addEventListener = addSpy;
    mounted.unmount();
  });

  test("pauses the loop when IntersectionObserver reports the canvas offscreen", () => {
    const mounted = render(<DitherBackground src="https://picsum.photos/seed/dither/800/600" />);
    expect(pendingFrames.size).toBe(1);

    const observer = FakeIntersectionObserver.instances.at(-1);
    act(() => {
      observer?.callback([{ isIntersecting: false } as IntersectionObserverEntry], observer as unknown as IntersectionObserver);
    });
    expect(pendingFrames.size).toBe(0);

    act(() => {
      observer?.callback([{ isIntersecting: true } as IntersectionObserverEntry], observer as unknown as IntersectionObserver);
    });
    expect(pendingFrames.size).toBe(1);

    mounted.unmount();
  });
});
