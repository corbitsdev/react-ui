import { describe, expect, test } from "bun:test";
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";

import { StepSidebar } from "./step-sidebar.js";
import type { WorkflowStep } from "../lib/workflow-run-progress.js";

const STEPS: WorkflowStep[] = [
  { number: 1, label: "Collect open invoices", status: "completed" },
  { number: 2, label: "Draft the reminder email", status: "current" },
  { number: 3, label: "Send to customers", status: "pending" },
];

function noop() {
  // default onToggle for mounts that don't assert on it
}

function mount(props: Partial<React.ComponentProps<typeof StepSidebar>> = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(StepSidebar, { steps: STEPS, onToggle: noop, ...props }));
  });
  return {
    container,
    toggle: () => container.querySelector("[data-slot='sidebar-collapse-toggle']") as HTMLButtonElement,
    root: () => container.querySelector("[data-slot='step-sidebar']") as HTMLElement,
    unmount: () => root.unmount(),
  };
}

/** A minimal host wrapper that owns `collapsed` state, mirroring how any
 * real consumer wires the controlled prop. */
function ControlledStepSidebar(props: Omit<React.ComponentProps<typeof StepSidebar>, "collapsed" | "onToggle">) {
  const [collapsed, setCollapsed] = useState(false);
  return createElement(StepSidebar, {
    ...props,
    collapsed,
    onToggle: () => setCollapsed((c) => !c),
  });
}

describe("StepSidebar", () => {
  test("renders every step with its number and label", () => {
    const { container, unmount } = mount();
    const items = container.querySelectorAll("li[data-step-status]");
    expect(items.length).toBe(3);
    expect(container.textContent).toContain("Collect open invoices");
    expect(container.textContent).toContain("Draft the reminder email");
    expect(container.textContent).toContain("Send to customers");
    unmount();
  });

  test("status glyphs reflect completed, current, and pending steps", () => {
    const { container, unmount } = mount();
    const items = Array.from(container.querySelectorAll("li[data-step-status]"));
    expect(items[0]?.getAttribute("data-step-status")).toBe("completed");
    expect(items[0]?.textContent).toContain("✓");
    expect(items[1]?.getAttribute("data-step-status")).toBe("current");
    expect(items[1]?.textContent).toContain("2");
    expect(items[2]?.getAttribute("data-step-status")).toBe("pending");
    unmount();
  });

  test("a failed step renders the failure glyph", () => {
    const { container, unmount } = mount({
      steps: [{ number: 1, label: "Send for approval", status: "failed" }],
    });
    const item = container.querySelector("li[data-step-status='failed']");
    expect(item).not.toBeNull();
    expect(item?.textContent).toContain("!");
    unmount();
  });

  test("defaults expanded when collapsed is omitted", () => {
    const { toggle, root, unmount } = mount();
    expect(root().getAttribute("data-collapsed")).toBe("false");
    expect(toggle().getAttribute("aria-label")).toBe("Collapse sidebar");
    expect(toggle().getAttribute("aria-expanded")).toBe("true");
    unmount();
  });

  test("collapsed is host-controlled: the toggle calls onToggle with no args, and the host decides the next state", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    let toggleCalls = 0;
    act(() => {
      root.render(
        createElement(StepSidebar, {
          steps: STEPS,
          collapsed: false,
          onToggle: () => {
            toggleCalls++;
          },
        }),
      );
    });
    const toggle = () => container.querySelector("[data-slot='sidebar-collapse-toggle']") as HTMLButtonElement;
    act(() => {
      toggle().dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(toggleCalls).toBe(1);
    // The component does not flip its own state: still reflects the prop.
    expect(container.querySelector("[data-slot='step-sidebar']")?.getAttribute("data-collapsed")).toBe("false");
    root.unmount();
  });

  test("a host wrapper owning collapsed state toggles the rendered state end to end", () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(createElement(ControlledStepSidebar, { steps: STEPS }));
    });
    const rootEl = () => container.querySelector("[data-slot='step-sidebar']") as HTMLElement;
    const toggle = () => container.querySelector("[data-slot='sidebar-collapse-toggle']") as HTMLButtonElement;
    expect(rootEl().getAttribute("data-collapsed")).toBe("false");

    act(() => {
      toggle().dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(rootEl().getAttribute("data-collapsed")).toBe("true");
    expect(toggle().getAttribute("aria-label")).toBe("Expand sidebar");

    act(() => {
      toggle().dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(rootEl().getAttribute("data-collapsed")).toBe("false");
    root.unmount();
  });

  test("renders no footer slot when omitted", () => {
    const { container, unmount } = mount();
    expect(container.querySelector("[data-slot='step-sidebar-footer']")).toBeNull();
    unmount();
  });

  test("renders arbitrary footer content, e.g. a sign-out control", () => {
    let signedOut = false;
    const { container, unmount } = mount({
      footer: createElement(
        "button",
        { type: "button", "aria-label": "Sign out", onClick: () => (signedOut = true) },
        "Sign out",
      ),
    });
    const footer = container.querySelector("[data-slot='step-sidebar-footer']");
    expect(footer).not.toBeNull();
    const signOutButton = footer?.querySelector("button[aria-label='Sign out']") as HTMLButtonElement;
    expect(signOutButton).not.toBeUndefined();
    act(() => {
      signOutButton.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(signedOut).toBe(true);
    unmount();
  });

  test("an empty steps array renders no items and does not crash", () => {
    const { container, unmount } = mount({ steps: [] });
    expect(container.querySelectorAll("li[data-step-status]").length).toBe(0);
    expect(container.querySelector("ol[aria-label='Workflow steps']")).not.toBeNull();
    unmount();
  });

  test("a long label truncates via the truncate class and carries a title attribute with the full text", () => {
    const longLabel =
      "Reconcile every outstanding invoice across all connected payment processors before sending the weekly summary";
    const { container, unmount } = mount({
      steps: [{ number: 1, label: longLabel, status: "current" }],
    });
    const labelSpan = container.querySelector("li[data-step-status='current'] span[title]") as HTMLElement;
    expect(labelSpan).not.toBeNull();
    expect(labelSpan.getAttribute("title")).toBe(longLabel);
    expect(labelSpan.className).toContain("truncate");
    unmount();
  });

  test("many steps still all render in the DOM inside the scrollable container", () => {
    const manySteps: WorkflowStep[] = Array.from({ length: 15 }, (_, i) => ({
      number: i + 1,
      label: `Step ${i + 1}`,
      status: i === 0 ? "completed" : i === 1 ? "current" : "pending",
    }));
    const { container, unmount } = mount({ steps: manySteps });
    const list = container.querySelector("ol[aria-label='Workflow steps']") as HTMLElement;
    expect(list.className).toContain("overflow-y-auto");
    expect(container.querySelectorAll("li[data-step-status]").length).toBe(15);
    unmount();
  });
});
