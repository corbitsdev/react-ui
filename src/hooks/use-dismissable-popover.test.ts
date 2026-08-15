import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { useDismissablePopover, type UseDismissablePopoverOptions } from "./use-dismissable-popover.js";

function mount(options: UseDismissablePopoverOptions = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = document.createElement("div");
  container.appendChild(root);
  const trigger = document.createElement("button");
  container.appendChild(trigger);
  const reactRoot = createRoot(container);

  let result: ReturnType<typeof useDismissablePopover<HTMLDivElement, HTMLButtonElement>> | undefined;

  function Host(props: UseDismissablePopoverOptions) {
    result = useDismissablePopover<HTMLDivElement, HTMLButtonElement>(props);
    return null;
  }

  act(() => {
    reactRoot.render(createElement(Host, options));
  });
  // Attach the hook's refs to real, already-mounted nodes since Host renders
  // no DOM of its own — the hook only reads `.current`, it never expects
  // React to have set it via a ref prop.
  (result as { rootRef: { current: HTMLDivElement | null } }).rootRef.current = root;
  (result as { triggerRef: { current: HTMLButtonElement | null } }).triggerRef.current = trigger;

  return {
    get: () => result as ReturnType<typeof useDismissablePopover<HTMLDivElement, HTMLButtonElement>>,
    rerender: (props: UseDismissablePopoverOptions) => {
      act(() => {
        reactRoot.render(createElement(Host, props));
      });
    },
    root,
    trigger,
    unmount: () => act(() => reactRoot.unmount()),
  };
}

describe("useDismissablePopover", () => {
  test("uncontrolled: starts closed and setOpen toggles it", () => {
    const handle = mount();
    expect(handle.get().open).toBe(false);
    act(() => handle.get().setOpen(true));
    expect(handle.get().open).toBe(true);
    handle.unmount();
  });

  test("uncontrolled: honors defaultOpen", () => {
    const handle = mount({ defaultOpen: true });
    expect(handle.get().open).toBe(true);
    handle.unmount();
  });

  test("controlled: open tracks the prop, not internal state", () => {
    let changed: boolean | undefined;
    const handle = mount({ open: false, onOpenChange: (value) => (changed = value) });
    act(() => handle.get().setOpen(true));
    expect(changed).toBe(true);
    expect(handle.get().open).toBe(false);
    handle.rerender({ open: true, onOpenChange: (value) => (changed = value) });
    expect(handle.get().open).toBe(true);
    handle.unmount();
  });

  test("Escape closes and returns focus to the trigger", () => {
    const handle = mount({ defaultOpen: true });
    let focused = false;
    handle.trigger.focus = () => {
      focused = true;
    };
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(handle.get().open).toBe(false);
    expect(focused).toBe(true);
    handle.unmount();
  });

  test("closeOnEscape: false leaves Escape handling to the caller", () => {
    const handle = mount({ defaultOpen: true, closeOnEscape: false });
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(handle.get().open).toBe(true);
    handle.unmount();
  });

  test("pointerdown outside the root closes it", () => {
    const handle = mount({ defaultOpen: true });
    const outside = document.createElement("div");
    document.body.appendChild(outside);
    act(() => {
      outside.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    expect(handle.get().open).toBe(false);
    outside.remove();
    handle.unmount();
  });

  test("pointerdown inside the root does not close it", () => {
    const handle = mount({ defaultOpen: true });
    act(() => {
      handle.root.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
    });
    expect(handle.get().open).toBe(true);
    handle.unmount();
  });
});
