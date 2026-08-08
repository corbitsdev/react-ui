import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import { useFocusTrap } from "../../src/hooks/use-focus-trap.js";

type Harness = {
  container: HTMLElement;
  trigger: HTMLButtonElement;
  trap: HTMLDivElement;
  setActive: (active: boolean) => void;
  setMiddleButton: (present: boolean) => void;
  setTrailingButton: (present: boolean) => void;
  /** Unmounts only the trap's own React tree — the trigger lives outside it, in plain DOM, so it survives to be asserted on afterwards. */
  unmountTrap: () => void;
  unmount: () => void;
};

/**
 * Mounts a plain-DOM trigger button (outside any React tree, so it survives
 * the trap's own unmount) alongside a React-rendered trap container with
 * `first` and `last` focusable buttons. Tests can toggle a `middle` button
 * (between `first` and `last`, never a boundary) and a `trailing` button
 * (after `last`, becoming the new last boundary once present) to exercise
 * focusable-set recalculation while the trap stays active.
 */
function mount(initialActive: boolean): Harness {
  const container = document.createElement("div");
  document.body.appendChild(container);

  const trigger = document.createElement("button");
  trigger.id = "trigger";
  trigger.textContent = "trigger";
  container.appendChild(trigger);

  const trapHost = document.createElement("div");
  container.appendChild(trapHost);

  let root!: Root;
  let setActiveState!: (active: boolean) => void;
  let setMiddleState!: (present: boolean) => void;
  let setTrailingState!: (present: boolean) => void;
  let trapElement!: HTMLDivElement;

  function TrapOnly() {
    const [active, setActive] = useState(initialActive);
    const [middle, setMiddle] = useState(false);
    const [trailing, setTrailing] = useState(false);
    setActiveState = setActive;
    setMiddleState = setMiddle;
    setTrailingState = setTrailing;
    const trapRef = useFocusTrap<HTMLDivElement>(active);

    return (
      <div
        ref={(node) => {
          trapRef.current = node;
          if (node) trapElement = node;
        }}
      >
        <button id="first">first</button>
        {middle ? <button id="middle">middle</button> : null}
        <button id="last">last</button>
        {trailing ? <button id="trailing">trailing</button> : null}
      </div>
    );
  }

  act(() => {
    root = createRoot(trapHost);
    root.render(<TrapOnly />);
  });

  return {
    container,
    trigger,
    trap: trapElement,
    setActive: (active) => act(() => setActiveState(active)),
    setMiddleButton: (present) => act(() => setMiddleState(present)),
    setTrailingButton: (present) => act(() => setTrailingState(present)),
    unmountTrap: () =>
      act(() => {
        root.unmount();
      }),
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

function fireTab(target: EventTarget, shiftKey: boolean): void {
  target.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true, cancelable: true }));
}

function byId(id: string): HTMLElement {
  const element = document.getElementById(id);
  if (!element) throw new Error(`missing #${id}`);
  return element;
}

describe("useFocusTrap", () => {
  test("moves focus into the container on activation", () => {
    const harness = mount(false);
    harness.trigger.focus();
    harness.setActive(true);
    expect(document.activeElement).toBe(byId("first"));
    harness.unmount();
  });

  test("does not steal focus if it's already inside the container on activation", () => {
    const harness = mount(false);
    byId("last").focus();
    harness.setActive(true);
    expect(document.activeElement).toBe(byId("last"));
    harness.unmount();
  });

  test("Tab on the last focusable wraps to the first", () => {
    const harness = mount(true);
    byId("last").focus();
    act(() => fireTab(harness.trap, false));
    expect(document.activeElement).toBe(byId("first"));
    harness.unmount();
  });

  test("Shift+Tab on the first focusable wraps to the last", () => {
    const harness = mount(true);
    byId("first").focus();
    act(() => fireTab(harness.trap, true));
    expect(document.activeElement).toBe(byId("last"));
    harness.unmount();
  });

  test("Tab in the middle of the trap does not wrap", () => {
    const harness = mount(true);
    harness.setMiddleButton(true);
    byId("middle").focus();
    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    act(() => harness.trap.dispatchEvent(event));
    // The hook only intervenes at the boundaries; a mid-trap Tab is left
    // alone entirely — no preventDefault, no forced focus() call — so focus
    // stays on `middle` and the event is left to the browser's native order.
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(byId("middle"));
    harness.unmount();
  });

  test("recalculates the focusable set when a trailing element shifts the last boundary", () => {
    const harness = mount(true);

    // Before `trailing` exists, `last` is the boundary: Tab from it wraps.
    byId("last").focus();
    act(() => fireTab(harness.trap, false));
    expect(document.activeElement).toBe(byId("first"));

    // Adding `trailing` while the trap stays active shifts the boundary —
    // this only passes if the keydown handler recomputes the focusable set
    // from the live DOM on every keypress instead of reusing a stale list
    // captured when the trap activated.
    harness.setTrailingButton(true);
    byId("last").focus();
    const midEvent = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    act(() => harness.trap.dispatchEvent(midEvent));
    expect(midEvent.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(byId("last"));

    // `trailing` is now the boundary: Tab from it wraps to `first`.
    byId("trailing").focus();
    act(() => fireTab(harness.trap, false));
    expect(document.activeElement).toBe(byId("first"));

    harness.unmount();
  });

  test("restores focus to the trigger when active turns false", () => {
    const harness = mount(false);
    harness.trigger.focus();
    harness.setActive(true);
    expect(document.activeElement).toBe(byId("first"));

    harness.setActive(false);
    expect(document.activeElement).toBe(harness.trigger);
    harness.unmount();
  });

  test("restores focus to the trigger on unmount while still active", () => {
    const harness = mount(false);
    harness.trigger.focus();
    harness.setActive(true);
    expect(document.activeElement).toBe(byId("first"));

    // Only the trap's own React tree unmounts here — the trigger lives
    // outside it in plain DOM, so it's still attached (and focusable) when
    // the cleanup effect restores focus to it.
    harness.unmountTrap();
    expect(document.activeElement).toBe(harness.trigger);
    harness.container.remove();
  });

  test("Tab with no focusable children prevents default instead of throwing", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    let trapElement!: HTMLDivElement;
    let root!: Root;

    function EmptyHarness() {
      const trapRef = useFocusTrap<HTMLDivElement>(true);
      return (
        <div
          ref={(node) => {
            trapRef.current = node;
            if (node) trapElement = node;
          }}
        />
      );
    }

    act(() => {
      root = createRoot(container);
      root.render(<EmptyHarness />);
    });

    const event = new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true });
    act(() => {
      trapElement.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);

    act(() => root.unmount());
    container.remove();
  });
});

