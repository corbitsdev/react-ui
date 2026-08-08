import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import { ChatDock, ChatDockScrim } from "../../src/ui/chat-dock.js";

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

function query(container: HTMLElement, selector: string): HTMLElement | null {
  return container.querySelector(selector);
}

describe("ChatDock modality", () => {
  test("docked mode is non-modal: role complementary, no aria-modal, no focus trap engaged", () => {
    const outside = document.createElement("button");
    outside.id = "outside-button";
    document.body.appendChild(outside);
    outside.focus();

    const mounted = render(
      <ChatDock mode="docked">
        <button id="inside-docked">inside</button>
      </ChatDock>,
    );

    const dock = query(mounted.container, '[data-slot="chat-dock"]');
    expect(dock?.getAttribute("role")).toBe("complementary");
    expect(dock?.getAttribute("aria-modal")).toBeNull();
    // Non-modal: the focus trap never activated, so focus was never yanked
    // away from whatever had it outside the dock.
    expect(document.activeElement).toBe(outside);

    mounted.unmount();
    outside.remove();
  });

  test("docked mode leaves background elements focusable and clickable", () => {
    const outside = document.createElement("button");
    let clicked = false;
    outside.addEventListener("click", () => {
      clicked = true;
    });
    document.body.appendChild(outside);

    const mounted = render(
      <ChatDock mode="docked">
        <button>inside</button>
      </ChatDock>,
    );

    outside.focus();
    expect(document.activeElement).toBe(outside);
    outside.click();
    expect(clicked).toBe(true);
    expect(outside.hasAttribute("inert")).toBe(false);
    expect(outside.disabled).toBe(false);

    mounted.unmount();
    outside.remove();
  });

  test("fullpage mode is modal: role dialog, aria-modal true, focus trap engaged", () => {
    const outside = document.createElement("button");
    document.body.appendChild(outside);
    outside.focus();

    const mounted = render(
      <ChatDock mode="fullpage">
        <button id="inside-fullpage">inside</button>
      </ChatDock>,
    );

    const dock = query(mounted.container, '[data-slot="chat-dock"]');
    expect(dock?.getAttribute("role")).toBe("dialog");
    expect(dock?.getAttribute("aria-modal")).toBe("true");
    // Modal: activation moved focus into the dock, off the outside trigger.
    expect(document.activeElement).toBe(document.getElementById("inside-fullpage"));

    mounted.unmount();
    outside.remove();
  });

  test("fullpage mode locks page scroll; docked mode does not", () => {
    const docked = render(<ChatDock mode="docked">content</ChatDock>);
    expect(document.body.style.overflow).not.toBe("hidden");
    docked.unmount();

    const fullpage = render(<ChatDock mode="fullpage">content</ChatDock>);
    expect(document.body.style.overflow).toBe("hidden");
    fullpage.unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});

describe("ChatDockScrim", () => {
  test("renders nothing for docked mode", () => {
    const mounted = render(<ChatDockScrim mode="docked" onClose={() => {}} />);
    expect(mounted.container.firstChild).toBeNull();
    mounted.unmount();
  });

  test("renders nothing for closed mode", () => {
    const mounted = render(<ChatDockScrim mode="closed" onClose={() => {}} />);
    expect(mounted.container.firstChild).toBeNull();
    mounted.unmount();
  });

  test("renders for fullpage mode and closes on click", () => {
    let closed = false;
    const mounted = render(<ChatDockScrim mode="fullpage" onClose={() => (closed = true)} />);
    const scrim = mounted.container.querySelector("button");
    expect(scrim).not.toBeNull();
    act(() => scrim?.click());
    expect(closed).toBe(true);
    mounted.unmount();
  });
});
