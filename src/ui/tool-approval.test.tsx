import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { describe, expect, test } from "bun:test";

import type { PartTool, ToolApprovalRecord } from "../lib/conversation.js";
import { ToolApproval, type ToolApprovalDecision } from "./tool-approval.js";

type Mounted = {
  container: HTMLElement;
  render: (node: React.ReactElement) => void;
  unmount: () => void;
};

function mount(node: React.ReactElement): Mounted {
  const container = document.createElement("div");
  document.body.appendChild(container);
  let root!: Root;
  act(() => {
    root = createRoot(container);
    root.render(node);
  });
  return {
    container,
    render: (next) => act(() => root.render(next)),
    unmount: () => {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function record(
  status: ToolApprovalRecord["status"],
  scope: ToolApprovalRecord["scope"] = null,
): ToolApprovalRecord {
  return { id: "approval-1", status, scope, timeoutAt: null };
}

function tool(overrides: Partial<PartTool> = {}): PartTool {
  return {
    kind: "tool-trace",
    toolCallId: "call-1",
    name: "mail__send",
    status: "approval-requested",
    input: { to: "team" },
    approval: record("pending"),
    ...overrides,
  };
}

/** A call with no approval record. */
function unrecorded(status: PartTool["status"]): PartTool {
  return {
    kind: "tool-trace",
    toolCallId: "call-1",
    name: "mail__send",
    status,
    input: { to: "team" },
  };
}

function button(container: HTMLElement, name: string): HTMLButtonElement {
  const found = [...container.querySelectorAll("button")].find(
    (element) => element.textContent === name,
  );
  if (found === undefined) throw new Error(`expected a ${name} button`);
  return found;
}

describe("ToolApproval", () => {
  const cases: readonly [string, ToolApprovalDecision][] = [
    ["Approve", { outcome: "approved", scope: "once" }],
    ["Approve always", { outcome: "approved", scope: "always" }],
    ["Deny", { outcome: "rejected", scope: "once" }],
  ];

  for (const [name, decision] of cases) {
    test(`${name} reports its decision once`, () => {
      const decisions: ToolApprovalDecision[] = [];
      const mounted = mount(
        <ToolApproval part={tool()} onDecide={(d) => decisions.push(d)} />,
      );
      act(() => button(mounted.container, name).click());
      expect(decisions).toEqual([decision]);
      mounted.unmount();
    });
  }

  test("pending shows the question, the call and its input on the wash", () => {
    const mounted = mount(
      <ToolApproval part={tool()} onDecide={() => {}}>
        <p>Send the renewal summary to the team.</p>
      </ToolApproval>,
    );
    const section = mounted.container.querySelector("section");
    expect(section?.className).toContain("bg-attention-wash");
    expect(section?.getAttribute("aria-labelledby")).not.toBeNull();
    expect(mounted.container.textContent).toContain("Needs your approval");
    expect(mounted.container.textContent).toContain("mail__send");
    expect(mounted.container.textContent).toContain('"to": "team"');
    expect(mounted.container.textContent).toContain(
      "Send the renewal summary to the team.",
    );
    mounted.unmount();
  });

  test("disabled holds decisions but keeps the buttons focusable", () => {
    const decisions: ToolApprovalDecision[] = [];
    const mounted = mount(
      <ToolApproval
        part={tool()}
        disabled
        onDecide={(d) => decisions.push(d)}
      />,
    );
    const approve = button(mounted.container, "Approve");
    expect(approve.disabled).toBe(false);
    expect(approve.getAttribute("aria-disabled")).toBe("true");
    act(() => approve.click());
    expect(decisions).toEqual([]);
    mounted.unmount();
  });

  test("an error is announced", () => {
    const mounted = mount(
      <ToolApproval
        part={tool()}
        error="Could not save."
        onDecide={() => {}}
      />,
    );
    expect(mounted.container.querySelector("[role='alert']")?.textContent).toBe(
      "Could not save.",
    );
    mounted.unmount();
  });

  const resolved: readonly [ToolApprovalRecord, string][] = [
    [record("approved", "once"), "Approved once"],
    [record("approved", "always"), "Approved always"],
    [record("approved"), "Approved"],
    [record("rejected", "once"), "Denied"],
    [record("rejected", "always"), "Always denied"],
    [record("timeout"), "Timed out"],
    [record("expired"), "Expired"],
  ];

  for (const [approval, line] of resolved) {
    test(`${approval.status}/${approval.scope} renders "${line}" and no buttons`, () => {
      const mounted = mount(
        <ToolApproval
          part={tool({ status: "output-denied", approval })}
          onDecide={() => {}}
        />,
      );
      const root = mounted.container.querySelector(
        "[data-slot='tool-approval']",
      );
      expect(root?.getAttribute("data-status")).toBe(approval.status);
      expect(root?.querySelector("span")?.textContent).toBe(line);
      expect(root?.textContent).toContain("mail__send");
      expect(mounted.container.querySelector("button")).toBeNull();
      mounted.unmount();
    });
  }

  test("the record decides over the call's status, both ways", () => {
    const settled = mount(
      <ToolApproval
        part={tool({
          status: "approval-requested",
          approval: record("timeout"),
        })}
        onDecide={() => {}}
      />,
    );
    expect(settled.container.querySelector("button")).toBeNull();
    expect(settled.container.textContent).toContain("Timed out");
    settled.unmount();

    const waiting = mount(
      <ToolApproval part={tool({ status: "running" })} onDecide={() => {}} />,
    );
    expect(waiting.container.querySelectorAll("button").length).toBe(3);
    waiting.unmount();
  });

  test("without a record, the call's own status decides", () => {
    const asking = mount(
      <ToolApproval
        part={unrecorded("approval-requested")}
        onDecide={() => {}}
      />,
    );
    expect(asking.container.querySelectorAll("button").length).toBe(3);
    asking.unmount();

    const none = mount(
      <ToolApproval
        part={unrecorded("output-available")}
        onDecide={() => {}}
      />,
    );
    expect(none.container.innerHTML).toBe("");
    none.unmount();
  });

  test("labels can be replaced", () => {
    const mounted = mount(
      <ToolApproval
        part={tool()}
        labels={{ approve: "Allow", deny: "Refuse" }}
        onDecide={() => {}}
      />,
    );
    button(mounted.container, "Allow");
    button(mounted.container, "Refuse");
    mounted.unmount();
  });

  test("focus moves to the resolved line when the record settles", () => {
    const mounted = mount(<ToolApproval part={tool()} onDecide={() => {}} />);
    const approve = button(mounted.container, "Approve");
    act(() => approve.focus());
    // The host records the decision; the button that held focus goes away.
    mounted.render(
      <ToolApproval
        part={tool({ status: "pending", approval: record("approved", "once") })}
        onDecide={() => {}}
      />,
    );
    const root = mounted.container.querySelector("[data-slot='tool-approval']");
    expect(approve.isConnected).toBe(false);
    expect(document.activeElement).toBe(root);
    mounted.unmount();
  });

  test("focus dropped to the page is left alone when the record settles", () => {
    const mounted = mount(<ToolApproval part={tool()} onDecide={() => {}} />);
    const input = mounted.container.querySelector<HTMLElement>(
      "[role='group'][tabindex='0']",
    );
    if (input === null) throw new Error("expected the input box");
    act(() => input.focus());
    // A click on blank page: focus goes to nothing, not to another element.
    act(() => input.blur());
    expect(document.activeElement).toBe(document.body);
    mounted.render(
      <ToolApproval
        part={tool({ approval: record("timeout") })}
        onDecide={() => {}}
      />,
    );
    expect(document.activeElement).toBe(document.body);
    mounted.unmount();
  });

  test("focus elsewhere is left alone when the record settles", () => {
    const outside = document.createElement("input");
    document.body.appendChild(outside);
    const mounted = mount(<ToolApproval part={tool()} onDecide={() => {}} />);
    act(() => button(mounted.container, "Approve").focus());
    act(() => outside.focus());
    mounted.render(
      <ToolApproval
        part={tool({ approval: record("expired") })}
        onDecide={() => {}}
      />,
    );
    expect(document.activeElement).toBe(outside);
    mounted.unmount();
    outside.remove();
  });
});
