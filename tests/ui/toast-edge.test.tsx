import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test } from "bun:test";

import { toast, Toaster } from "../../src/ui/toast.js";

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

function visibleToasts() {
  return document.body.querySelectorAll("[data-sonner-toast]");
}

async function wait(ms: number) {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  });
}

describe("toast replace-semantics edges", () => {
  let mounted: Mounted | undefined;

  afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
  });

  test("replacing mid-display restarts the 1800ms timer", async () => {
    mounted = render(<Toaster />);
    act(() => toast("First"));
    await wait(1200);
    act(() => toast("Second"));
    await wait(1200);
    const shown = visibleToasts();
    expect(shown.length).toBe(1);
    expect(shown[0]?.textContent).toBe("Second");
    expect(shown[0]?.getAttribute("data-removed")).toBe("false");
    await wait(1300);
    expect(visibleToasts().length).toBe(0);
  });

  test("firing during the previous toast's exit window still shows", async () => {
    mounted = render(<Toaster />);
    act(() => toast("First"));
    await wait(1880);
    const exiting = visibleToasts()[0];
    expect(exiting?.getAttribute("data-removed")).toBe("true");
    act(() => toast("Second"));
    await wait(400);
    const shown = visibleToasts();
    expect(shown.length).toBe(1);
    expect(shown[0]?.textContent).toBe("Second");
    expect(shown[0]?.getAttribute("data-removed")).toBe("false");
  });

  test("firing after the previous toast fully unmounted shows again", async () => {
    mounted = render(<Toaster />);
    act(() => toast("First"));
    await wait(2400);
    expect(visibleToasts().length).toBe(0);
    act(() => toast("Second"));
    await wait(100);
    const shown = visibleToasts();
    expect(shown.length).toBe(1);
    expect(shown[0]?.textContent).toBe("Second");
  });
});
