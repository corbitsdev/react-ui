import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import { ToolBlock } from "../../src/ui/tool-block.js";

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

function toggleButton(container: HTMLElement): HTMLButtonElement {
  const button = container.querySelector("[data-slot='tool-block'] button");
  if (button === null) throw new Error("expected a toggle button");
  return button as HTMLButtonElement;
}

describe("ToolBlock", () => {
  test("humanises a raw tool name when no label is given", () => {
    const mounted = render(<ToolBlock name="slack__post_message" state={{ status: "pending" }} />);
    expect(mounted.container.textContent).toContain("Post message (Slack)");
    mounted.unmount();
  });

  test("prefers an explicit label over the humanised name", () => {
    const mounted = render(
      <ToolBlock name="slack__post_message" label="Posted to #general" state={{ status: "pending" }} />,
    );
    expect(mounted.container.textContent).toContain("Posted to #general");
    mounted.unmount();
  });

  test("pending and running states start collapsed with no detail toggle", () => {
    const mounted = render(<ToolBlock name="search" state={{ status: "running" }} />);
    const button = toggleButton(mounted.container);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    expect(button.disabled).toBe(true);
    mounted.unmount();
  });

  test("output-available starts collapsed but expands on click", () => {
    const mounted = render(<ToolBlock name="search" state={{ status: "output-available", output: "3 results" }} />);
    const button = toggleButton(mounted.container);
    expect(button.getAttribute("aria-expanded")).toBe("false");
    act(() => button.click());
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(mounted.container.textContent).toContain("3 results");
    mounted.unmount();
  });

  test.each([
    ["error", { status: "error", message: "timed out" } as const, "timed out"],
    ["approval-requested", { status: "approval-requested", reason: "writes to prod" } as const, "writes to prod"],
    ["output-denied", { status: "output-denied", reason: "not authorised" } as const, "not authorised"],
  ])("%s state opens by default and shows its detail", (_label, state, expectedText) => {
    const mounted = render(<ToolBlock name="deploy" state={state} />);
    const button = toggleButton(mounted.container);
    expect(button.getAttribute("aria-expanded")).toBe("true");
    expect(mounted.container.textContent).toContain(expectedText);
    mounted.unmount();
  });

  test("shows input JSON alongside output when both are present", () => {
    const mounted = render(
      <ToolBlock
        name="search"
        input={{ query: "invoices" }}
        state={{ status: "output-available", output: "3 results" }}
        defaultOpen
      />,
    );
    expect(mounted.container.textContent).toContain('"query"');
    expect(mounted.container.textContent).toContain("invoices");
    mounted.unmount();
  });

  test("carries its status as a data attribute for state-based styling", () => {
    const mounted = render(<ToolBlock name="search" state={{ status: "running" }} />);
    const root = mounted.container.querySelector("[data-slot='tool-block']");
    expect(root?.getAttribute("data-status")).toBe("running");
    mounted.unmount();
  });

  test("announces approval-requested as a polite status region", () => {
    const mounted = render(<ToolBlock name="deploy" state={{ status: "approval-requested" }} />);
    const status = mounted.container.querySelector("[data-slot='tool-block-status']");
    expect(status?.getAttribute("role")).toBe("status");
    expect(status?.getAttribute("aria-live")).toBe("polite");
    mounted.unmount();
  });

  test.each([
    ["pending", { status: "pending" } as const],
    ["running", { status: "running" } as const],
    ["output-available", { status: "output-available", output: "ok" } as const],
    ["error", { status: "error", message: "failed" } as const],
    ["output-denied", { status: "output-denied" } as const],
  ])("%s state carries no status-region announcement", (_label, state) => {
    const mounted = render(<ToolBlock name="deploy" state={state} />);
    const status = mounted.container.querySelector("[data-slot='tool-block-status']");
    expect(status?.getAttribute("role")).toBeNull();
    expect(status?.getAttribute("aria-live")).toBeNull();
    mounted.unmount();
  });
});
