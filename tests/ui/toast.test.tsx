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

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

describe("Toaster", () => {
  let mounted: Mounted | undefined;

  afterEach(() => {
    mounted?.unmount();
    mounted = undefined;
  });

  test("anchors the stack to the bottom center", async () => {
    mounted = render(<Toaster />);
    act(() => toast("Routine created"));
    await flush();
    const region = document.body.querySelector("[data-sonner-toaster]");
    expect(region?.getAttribute("data-y-position")).toBe("bottom");
    expect(region?.getAttribute("data-x-position")).toBe("center");
  });

  test("shows a plain-text confirmation", async () => {
    mounted = render(<Toaster />);
    act(() => toast("Channel created"));
    await flush();
    const shown = visibleToasts();
    expect(shown.length).toBe(1);
    expect(shown[0]?.textContent).toBe("Channel created");
  });

  test("styles the toast with the corbits class instead of sonner defaults", async () => {
    mounted = render(<Toaster />);
    act(() => toast("Settings saved"));
    await flush();
    const shown = visibleToasts()[0];
    expect(shown?.classList.contains("corbits-toast")).toBe(true);
    expect(shown?.getAttribute("data-styled")).toBe("false");
  });

  test("replaces the current toast instead of stacking a second one", async () => {
    mounted = render(<Toaster />);
    act(() => toast("Pinned Deploy notes"));
    await flush();
    act(() => toast("Unpinned Deploy notes"));
    await flush();
    const staying = document.body.querySelectorAll(
      '[data-sonner-toast][data-removed="false"]',
    );
    expect(staying.length).toBe(1);
    expect(staying[0]?.textContent).toBe("Unpinned Deploy notes");
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 300));
    });
    expect(visibleToasts().length).toBe(1);
  });

  test("dismisses on its own after the confirmation duration", async () => {
    mounted = render(<Toaster />);
    act(() => toast("Grant revoked"));
    await flush();
    expect(visibleToasts().length).toBe(1);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 2400));
    });
    expect(visibleToasts().length).toBe(0);
  });
});
