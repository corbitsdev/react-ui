import { describe, expect, test } from "bun:test";
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";

import { StepSidebar } from "./step-sidebar.js";
import type { WorkflowStep } from "../lib/workflow-run-progress.js";

const STEPS: WorkflowStep[] = [
  { number: 1, label: "Collect open invoices", status: "completed" },
  { number: 2, label: "Draft the reminder email", status: "current" },
  { number: 3, label: "Send to customers", status: "pending" },
];

function mount(props: Partial<React.ComponentProps<typeof StepSidebar>> = {}) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(createElement(StepSidebar, { steps: STEPS, ...props }));
  });
  return {
    container,
    toggle: () => container.querySelector("[data-slot='step-sidebar-collapse-toggle']") as HTMLButtonElement,
    root: () => container.querySelector("[data-slot='step-sidebar']") as HTMLElement,
    unmount: () => root.unmount(),
  };
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

  test("defaults expanded, and the toggle collapses and re-expands it", () => {
    const { toggle, root, unmount } = mount();
    expect(root().getAttribute("data-collapsed")).toBe("false");
    expect(toggle().getAttribute("aria-label")).toBe("Collapse sidebar");
    expect(toggle().getAttribute("aria-expanded")).toBe("true");

    act(() => {
      toggle().dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(root().getAttribute("data-collapsed")).toBe("true");
    expect(toggle().getAttribute("aria-label")).toBe("Expand sidebar");
    expect(toggle().getAttribute("aria-expanded")).toBe("false");

    act(() => {
      toggle().dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    expect(root().getAttribute("data-collapsed")).toBe("false");
    unmount();
  });

  test("defaultCollapsed seeds the initial state without a window read", () => {
    const { root, unmount } = mount({ defaultCollapsed: true });
    expect(root().getAttribute("data-collapsed")).toBe("true");
    unmount();
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
});
